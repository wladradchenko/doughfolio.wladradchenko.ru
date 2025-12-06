/**
 * Utility functions for fetching GitHub repository data
 */

export type GitHubMetrics = {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  language: string | null;
  license: string | null;
  lastCommit: string | null;
  contributorsCount: number;
  createdAt: string | null;
};

/**
 * Extracts owner and repo name from GitHub URL
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/
 * - github.com/owner/repo
 * - owner/repo (relative path)
 * - https://www.github.com/owner/repo
 */
export const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
  try {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Remove trailing slash and protocol
    let cleanUrl = url.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    
    // Try to match github.com/owner/repo pattern first
    let match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match && match[1] && match[2]) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''), // Remove .git suffix if present
      };
    }
    
    // If no github.com found, try to match owner/repo pattern directly
    // This handles cases like "coffeexcoin/endless-clouds"
    match = cleanUrl.match(/^([^\/]+)\/([^\/]+)$/);
    if (match && match[1] && match[2]) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''), // Remove .git suffix if present
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to parse GitHub URL:', error, 'URL:', url);
    return null;
  }
};

/**
 * Fetches GitHub repository metrics
 * Non-blocking operation - returns null on error
 */
export const fetchGitHubMetrics = async (githubUrl: string): Promise<GitHubMetrics | null> => {
  try {
    const parsed = parseGitHubUrl(githubUrl);
    if (!parsed) {
      console.log('Failed to parse GitHub URL:', githubUrl);
      return null;
    }

    const { owner, repo } = parsed;
    console.log('Fetching GitHub metrics for:', `${owner}/${repo}`);

    // Fetch repository data
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        // GitHub API allows 60 requests/hour without auth, which should be enough
        // If needed, can add token later
      },
    });

    if (!repoResponse.ok) {
      // 404 = repo not found, 403 = rate limit, etc.
      if (repoResponse.status === 404) {
        console.log(`GitHub repo not found: ${owner}/${repo}`);
      } else if (repoResponse.status === 403) {
        console.log('GitHub API rate limit reached');
      }
      return null;
    }

    const repoData = await repoResponse.json();

    // Fetch contributors count
    let contributorsCount = 0;
    try {
      // First, try to get count from pagination header
      const contributorsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (contributorsResponse.ok) {
        const linkHeader = contributorsResponse.headers.get('link');
        if (linkHeader) {
          // Extract last page number from Link header
          const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
          if (lastPageMatch) {
            contributorsCount = parseInt(lastPageMatch[1], 10);
          }
        } else {
          // No pagination means <= 30 contributors, fetch and count
          const fullContributorsResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`,
            {
              headers: {
                'Accept': 'application/vnd.github.v3+json',
              },
            }
          );
          if (fullContributorsResponse.ok) {
            const contributors = await fullContributorsResponse.json();
            contributorsCount = Array.isArray(contributors) ? contributors.length : 0;
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch contributors:', error);
      // Continue without contributors count
    }

    // Get last commit date
    let lastCommit: string | null = null;
    try {
      const commitsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (commitsResponse.ok) {
        const commits = await commitsResponse.json();
        if (Array.isArray(commits) && commits.length > 0 && commits[0].commit?.author?.date) {
          lastCommit = commits[0].commit.author.date;
        }
      }
    } catch (error) {
      console.error('Failed to fetch last commit:', error);
      // Use updated_at as fallback
      lastCommit = repoData.updated_at || null;
    }

    return {
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      watchers: repoData.watchers_count || 0,
      openIssues: repoData.open_issues_count || 0,
      language: repoData.language || null,
      license: repoData.license?.name || null,
      lastCommit: lastCommit || repoData.updated_at || null,
      contributorsCount: contributorsCount || 0,
      createdAt: repoData.created_at || null,
    };
  } catch (error) {
    console.error('Failed to fetch GitHub metrics:', error);
    return null;
  }
};

/**
 * Formats date to relative time (e.g., "2 days ago")
 */
export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
      }
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  } catch (error) {
    return dateString;
  }
};

