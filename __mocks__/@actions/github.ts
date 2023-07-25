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
      createComment: jest.fn(),
    },
    pulls: {
      get: jest.fn().mockResolvedValue({
        data: {
          user: {},
        },
      }),
      listFiles: {
        endpoint: {
          merge: jest.fn().mockReturnValue({}),
        },
      },
    },
    repos: {
      getContent: jest.fn(),
    },
  },
  paginate: jest.fn(),
};

export const getOctokit = jest.fn().mockImplementation(() => mockApi);
