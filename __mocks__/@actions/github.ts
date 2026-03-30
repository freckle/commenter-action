import { vi } from "vitest";

export const context = {
  payload: {
    pull_request: {
      number: 123,
    },
  },
  repo: {
    owner: "monalisa",
    repo: "helloworld",
  },
  issue: {
    number: 123,
  },
  sha: "abc123",
};

const mockApi = {
  rest: {
    issues: {
      createComment: vi.fn(),
    },
    pulls: {
      get: vi.fn(() => {
        return {
          data: {
            user: {},
            labels: [],
          },
        };
      }),
      listFiles: {
        endpoint: {
          merge: vi.fn(() => {}),
        },
      },
    },
    repos: {
      getContent: vi.fn(),
    },
  },
  paginate: vi.fn(),
};

export const getOctokit = vi.fn(() => mockApi);
