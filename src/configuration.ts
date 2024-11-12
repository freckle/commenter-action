import * as github from "@actions/github";

import { fetchRepoContent } from "./repo-content";
import { ConfigurationWhereClause } from "./where";

type ClientType = ReturnType<typeof github.getOctokit>;

export type Configuration = {
  body: string | undefined;
  "body-file": string | undefined;
  "body-file-name": string | undefined;
  where: ConfigurationWhereClause;
};

export async function getConfigurations(
  client: ClientType,
  configurationPath: string,
): Promise<Map<string, Configuration>> {
  const configurationContent: string = await fetchRepoContent(
    client,
    configurationPath,
  );

  const configObject: any = yaml.load(configurationContent);
  return configObject;
}

export async function getCommentBody(
  client: ClientType,
  bodyFilePrefix: string,
  config: Configuration,
): Promise<string | null> {
  if (config.body) {
    return config.body;
  } else {
    const bodyFileName = config["body-file-name"] ?? `${name}.md`;
    const bodyFile = config["body-file"] ?? `${bodyFilePrefix}${bodyFileName}`;
    return await fetchRepoContent(client, bodyFile);
  }

  return null;
}
