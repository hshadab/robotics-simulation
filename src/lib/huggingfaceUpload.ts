/**
 * HuggingFace Hub Upload
 *
 * Upload datasets directly to HuggingFace Hub from RoboSim.
 * Requires user authentication with a HuggingFace token.
 */

/**
 * Upload progress callback
 */
export type UploadProgressCallback = (
  progress: number,
  message: string,
  phase: 'preparing' | 'uploading' | 'finalizing'
) => void;

/**
 * Upload result
 */
export interface UploadResult {
  success: boolean;
  repoUrl?: string;
  error?: string;
}

/**
 * Repository info from HuggingFace
 */
export interface RepoInfo {
  id: string;
  author: string;
  private: boolean;
  url: string;
}

const HF_API_BASE = 'https://huggingface.co/api';

/**
 * Validate HuggingFace token
 */
export async function validateToken(token: string): Promise<{ valid: boolean; username?: string }> {
  try {
    const response = await fetch(`${HF_API_BASE}/whoami`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json();
    return { valid: true, username: data.name };
  } catch {
    return { valid: false };
  }
}

/**
 * Create a new dataset repository on HuggingFace
 */
export async function createDatasetRepo(
  token: string,
  repoName: string,
  isPrivate: boolean = false
): Promise<RepoInfo> {
  const response = await fetch(`${HF_API_BASE}/repos/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'dataset',
      name: repoName,
      private: isPrivate,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create repository: ${error}`);
  }

  const data = await response.json();
  return {
    id: data.id || `${data.name}`,
    author: data.author || data.name?.split('/')[0],
    private: isPrivate,
    url: `https://huggingface.co/datasets/${data.id || data.name}`,
  };
}

/**
 * Upload a file to a HuggingFace dataset repository
 */
export async function uploadFile(
  token: string,
  repoId: string,
  filePath: string,
  fileContent: Blob | ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<void> {
  const uploadUrl = `${HF_API_BASE}/datasets/${repoId}/upload/main/${encodeURIComponent(filePath)}`;

  // Convert to Blob if ArrayBuffer
  const blob = fileContent instanceof Blob
    ? fileContent
    : new Blob([fileContent]);

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.send(blob);
  });
}

/**
 * Upload a complete LeRobot dataset to HuggingFace
 */
export async function uploadDataset(
  token: string,
  repoName: string,
  files: Map<string, Blob | ArrayBuffer>,
  options: {
    isPrivate?: boolean;
    description?: string;
    onProgress?: UploadProgressCallback;
  } = {}
): Promise<UploadResult> {
  const { isPrivate = false, description, onProgress } = options;

  try {
    // Phase 1: Create repository
    onProgress?.(0, 'Creating repository...', 'preparing');

    let repoInfo: RepoInfo;
    try {
      repoInfo = await createDatasetRepo(token, repoName, isPrivate);
    } catch (error) {
      // Repository might already exist, try to use it
      const username = (await validateToken(token)).username;
      repoInfo = {
        id: `${username}/${repoName}`,
        author: username || '',
        private: isPrivate,
        url: `https://huggingface.co/datasets/${username}/${repoName}`,
      };
    }

    onProgress?.(10, 'Repository ready', 'preparing');

    // Phase 2: Upload files
    const fileList = Array.from(files.entries());
    const totalFiles = fileList.length;

    for (let i = 0; i < fileList.length; i++) {
      const [filePath, content] = fileList[i];
      const fileProgress = 10 + ((i / totalFiles) * 80);

      onProgress?.(
        fileProgress,
        `Uploading ${filePath} (${i + 1}/${totalFiles})`,
        'uploading'
      );

      await uploadFile(token, repoInfo.id, filePath, content, (progress) => {
        const overallProgress = fileProgress + (progress / 100) * (80 / totalFiles);
        onProgress?.(overallProgress, `Uploading ${filePath}... ${progress}%`, 'uploading');
      });
    }

    // Phase 3: Add README if description provided
    if (description) {
      onProgress?.(95, 'Adding README...', 'finalizing');

      const readmeContent = generateDatasetCard(repoName, description);
      await uploadFile(
        token,
        repoInfo.id,
        'README.md',
        new Blob([readmeContent], { type: 'text/markdown' })
      );
    }

    onProgress?.(100, 'Upload complete!', 'finalizing');

    return {
      success: true,
      repoUrl: repoInfo.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Generate dataset card (README.md) for HuggingFace
 */
function generateDatasetCard(name: string, description: string): string {
  return `---
license: mit
task_categories:
  - robotics
tags:
  - lerobot
  - robosim
  - so-101
  - imitation-learning
---

# ${name}

${description}

## Dataset Details

This dataset was recorded using [RoboSim](https://github.com/your-repo/robosim), a browser-based robotics simulation platform.

### Robot
- **Type**: SO-101 (6-DOF robot arm)
- **Joints**: shoulder_pan, shoulder_lift, elbow_flex, wrist_flex, wrist_roll, gripper

### Format
- **Version**: LeRobot v3.0
- **Data**: Parquet files with observation states and actions
- **Video**: MP4 recordings of demonstrations

## Usage with LeRobot

\`\`\`python
from lerobot.common.datasets.lerobot_dataset import LeRobotDataset

dataset = LeRobotDataset("${name}")
print(f"Loaded {len(dataset)} frames from {dataset.num_episodes} episodes")
\`\`\`

## Training

\`\`\`bash
python lerobot/scripts/train.py \\
  --dataset.repo_id=${name} \\
  --policy.name=act \\
  --training.num_epochs=100
\`\`\`

## Citation

If you use this dataset, please cite RoboSim:

\`\`\`bibtex
@software{robosim2024,
  title={RoboSim: AI-Native Robotics Simulation},
  year={2024},
  url={https://github.com/your-repo/robosim}
}
\`\`\`
`;
}

/**
 * Check if a repository exists
 */
export async function checkRepoExists(token: string, repoId: string): Promise<boolean> {
  try {
    const response = await fetch(`${HF_API_BASE}/datasets/${repoId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Delete a repository (use with caution)
 */
export async function deleteRepo(token: string, repoId: string): Promise<boolean> {
  try {
    const response = await fetch(`${HF_API_BASE}/repos/delete`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'dataset',
        name: repoId,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get user's datasets
 */
export async function getUserDatasets(token: string): Promise<string[]> {
  try {
    const { username } = await validateToken(token);
    if (!username) return [];

    const response = await fetch(`${HF_API_BASE}/datasets?author=${username}&limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return [];

    const datasets = await response.json();
    return datasets.map((d: { id: string }) => d.id);
  } catch {
    return [];
  }
}
