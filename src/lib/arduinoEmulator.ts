/**
 * Arduino Emulator using avr8js
 * Provides browser-based ATmega328p emulation for testing Arduino code
 */

import {
  CPU,
  avrInstruction,
  AVRTimer,
  AVRIOPort,
  portDConfig,
  portBConfig,
  AVRUSART,
  usart0Config,
  timer0Config,
  timer1Config,
  timer2Config,
  PinState,
} from 'avr8js';

export interface ArduinoEmulatorState {
  running: boolean;
  cycleCount: number;
  serialOutput: string;
  pinStates: Record<number, PinState>;
  pwmValues: Record<number, number>;
}

export interface ServoState {
  pin: number;
  angle: number;
  pulseWidth: number;
}

export class ArduinoEmulator {
  private cpu: CPU | null = null;
  private portD: AVRIOPort | null = null;
  private portB: AVRIOPort | null = null;
  private usart: AVRUSART | null = null;

  private program: Uint16Array = new Uint16Array(0);
  private running = false;
  private serialOutput = '';
  private pinStates: Record<number, PinState> = {};
  private pwmValues: Record<number, number> = {};
  private servoStates = new Map<number, ServoState>();

  private onSerialOutput?: (char: string) => void;
  private onPinChange?: (pin: number, state: PinState) => void;
  private onServoChange?: (pin: number, angle: number) => void;

  constructor() {
    this.reset();
  }

  /**
   * Load compiled Arduino hex program
   */
  loadHex(hexString: string): boolean {
    try {
      const program = this.parseIntelHex(hexString);
      this.program = program;
      this.reset();
      return true;
    } catch (error) {
      console.error('Failed to load hex:', error);
      return false;
    }
  }

  /**
   * Load pre-compiled program bytes
   */
  loadProgram(bytes: Uint8Array): boolean {
    try {
      // Convert bytes to 16-bit words (little-endian)
      const words = new Uint16Array(bytes.length / 2);
      for (let i = 0; i < words.length; i++) {
        words[i] = bytes[i * 2] | (bytes[i * 2 + 1] << 8);
      }
      this.program = words;
      this.reset();
      return true;
    } catch (error) {
      console.error('Failed to load program:', error);
      return false;
    }
  }

  /**
   * Reset the emulator to initial state
   */
  reset(): void {
    // Initialize CPU with 16KB flash (ATmega328p)
    const flash = new Uint16Array(16384);
    flash.set(this.program);

    this.cpu = new CPU(flash);

    // Setup timers using pre-defined configs
    // Timers register themselves with the CPU and are updated automatically
    new AVRTimer(this.cpu, timer0Config);
    new AVRTimer(this.cpu, timer1Config);
    new AVRTimer(this.cpu, timer2Config);

    // Setup I/O ports
    this.portD = new AVRIOPort(this.cpu, portDConfig);
    this.portB = new AVRIOPort(this.cpu, portBConfig);

    // Setup USART for serial communication
    this.usart = new AVRUSART(this.cpu, usart0Config, 16000000);
    this.usart.onByteTransmit = (byte: number) => {
      const char = String.fromCharCode(byte);
      this.serialOutput += char;
      this.onSerialOutput?.(char);
    };

    // Setup pin change listeners
    this.portD.addListener(() => {
      this.updatePinStates();
    });
    this.portB.addListener(() => {
      this.updatePinStates();
    });

    // Reset state
    this.running = false;
    this.serialOutput = '';
    this.pinStates = {};
    this.pwmValues = {};
    this.servoStates.clear();
  }

  private updatePinStates(): void {
    if (!this.portD || !this.portB) return;

    // Update pin states for digital pins 0-7 (Port D)
    for (let i = 0; i < 8; i++) {
      const state = this.portD.pinState(i);
      if (this.pinStates[i] !== state) {
        this.pinStates[i] = state;
        this.onPinChange?.(i, state);
        this.checkServoUpdate(i, state);
      }
    }

    // Update pin states for digital pins 8-13 (Port B, bits 0-5)
    for (let i = 0; i < 6; i++) {
      const pin = i + 8;
      const state = this.portB.pinState(i);
      if (this.pinStates[pin] !== state) {
        this.pinStates[pin] = state;
        this.onPinChange?.(pin, state);
        this.checkServoUpdate(pin, state);
      }
    }
  }

  private checkServoUpdate(pin: number, state: PinState): void {
    // Simple servo detection based on pin state
    const servo = this.servoStates.get(pin);
    if (servo && (state === PinState.High || state === PinState.Low)) {
      // Estimate angle based on PWM duty cycle
      const pwmValue = this.pwmValues[pin] || 0;
      const angle = Math.round((pwmValue / 255) * 180);
      if (servo.angle !== angle) {
        servo.angle = angle;
        this.onServoChange?.(pin, angle);
      }
    }
  }

  /**
   * Run emulation for specified number of cycles
   */
  runCycles(cycles: number): void {
    if (!this.cpu) return;

    for (let i = 0; i < cycles; i++) {
      avrInstruction(this.cpu);
      // Timers are automatically updated through CPU hooks in avr8js
    }
  }

  /**
   * Run emulation for specified milliseconds (simulated time)
   */
  runMs(ms: number): void {
    // ATmega328p runs at 16MHz, so 16000 cycles per ms
    const cycles = ms * 16000;
    this.runCycles(cycles);
  }

  /**
   * Start continuous emulation
   */
  start(): void {
    if (this.running || !this.cpu) return;

    this.running = true;
    const runStep = () => {
      if (!this.running) return;

      // Run ~1ms worth of cycles per frame (16000 cycles @ 16MHz)
      this.runCycles(16000);

      requestAnimationFrame(runStep);
    };

    runStep();
  }

  /**
   * Stop emulation
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Set digital input pin value
   */
  setDigitalInput(pin: number, value: boolean): void {
    if (!this.portD || !this.portB) return;

    if (pin < 8) {
      // Port D
      this.portD.setPin(pin, value);
    } else if (pin < 14) {
      // Port B
      this.portB.setPin(pin - 8, value);
    }
  }

  /**
   * Set analog input value (0-1023)
   */
  setAnalogInput(_pin: number, value: number): void {
    if (!this.cpu) return;

    // ADC result registers
    const clampedValue = Math.max(0, Math.min(1023, value));

    // Write to ADC registers (ADCL and ADCH)
    this.cpu.data[0x78] = clampedValue & 0xff; // ADCL
    this.cpu.data[0x79] = (clampedValue >> 8) & 0x03; // ADCH
  }

  /**
   * Send serial data to the emulator
   */
  sendSerial(data: string): void {
    if (!this.usart) return;

    for (const char of data) {
      this.usart.writeByte(char.charCodeAt(0));
    }
  }

  /**
   * Register a servo on a pin
   */
  attachServo(pin: number): void {
    this.servoStates.set(pin, { pin, angle: 90, pulseWidth: 1500 });
  }

  /**
   * Get servo angle for a pin
   */
  getServoAngle(pin: number): number {
    return this.servoStates.get(pin)?.angle ?? 90;
  }

  /**
   * Get current state
   */
  getState(): ArduinoEmulatorState {
    return {
      running: this.running,
      cycleCount: this.cpu?.cycles ?? 0,
      serialOutput: this.serialOutput,
      pinStates: { ...this.pinStates },
      pwmValues: { ...this.pwmValues },
    };
  }

  /**
   * Set callback for serial output
   */
  onSerial(callback: (char: string) => void): void {
    this.onSerialOutput = callback;
  }

  /**
   * Set callback for pin changes
   */
  onPin(callback: (pin: number, state: PinState) => void): void {
    this.onPinChange = callback;
  }

  /**
   * Set callback for servo changes
   */
  onServo(callback: (pin: number, angle: number) => void): void {
    this.onServoChange = callback;
  }

  /**
   * Parse Intel HEX format
   */
  private parseIntelHex(hex: string): Uint16Array {
    const lines = hex.split('\n');
    const bytes: number[] = [];

    for (const line of lines) {
      if (!line.startsWith(':')) continue;

      const byteCount = parseInt(line.substring(1, 3), 16);
      const address = parseInt(line.substring(3, 7), 16);
      const recordType = parseInt(line.substring(7, 9), 16);

      if (recordType === 0x00) {
        // Data record
        for (let i = 0; i < byteCount; i++) {
          const byteValue = parseInt(line.substring(9 + i * 2, 11 + i * 2), 16);
          bytes[address + i] = byteValue;
        }
      } else if (recordType === 0x01) {
        // End of file
        break;
      }
    }

    // Convert to 16-bit words
    const words = new Uint16Array(Math.ceil(bytes.length / 2));
    for (let i = 0; i < words.length; i++) {
      words[i] = (bytes[i * 2] ?? 0) | ((bytes[i * 2 + 1] ?? 0) << 8);
    }

    return words;
  }
}

/**
 * Create a simple Arduino program for testing
 * This creates a blink program that toggles pin 13
 */
export function createBlinkProgram(): Uint8Array {
  // Simple blink program in AVR machine code
  // This is a minimal blink that toggles PB5 (pin 13)
  const program = new Uint8Array([
    // Setup: Set PB5 as output
    0x25, 0x9a, // sbi DDRB, 5

    // Loop:
    0x2d, 0x9a, // sbi PORTB, 5  (LED on)
    0xff, 0xcf, // rjmp -1 (delay loop placeholder)
    0x2d, 0x98, // cbi PORTB, 5  (LED off)
    0xff, 0xcf, // rjmp -1 (delay loop placeholder)
    0xf9, 0xcf, // rjmp Loop
  ]);

  return program;
}

// Singleton instance for easy access
let emulatorInstance: ArduinoEmulator | null = null;

export function getArduinoEmulator(): ArduinoEmulator {
  if (!emulatorInstance) {
    emulatorInstance = new ArduinoEmulator();
  }
  return emulatorInstance;
}

// Re-export PinState for convenience
export { PinState };
