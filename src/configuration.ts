import * as github from "@actions/github";
import * as yaml from "js-yaml";

import { fetchRepoContent } from "./repo-content.js";
import { ConfigurationWhereClause } from "./where.js";

type ClientType = ReturnType<typeof github.getOctokit>;

export type Configuration = {
  where: ConfigurationWhereClause;
  body: string;
};

export type Configurations = Map<string, Configuration>;

export async function getConfigurations(
  client: ClientType,
  configurationPath: string,
  bodyFilePrefix: string,
): Promise<Configurations> {
  const configurationContent: string = await fetchRepoContent(
    client,
    configurationPath,
  );

  const raw = yaml.load(configurationContent) as Map<string, ConfigurationYaml>;
  return fromConfigurationYaml(client, bodyFilePrefix, raw);
}

type ConfigurationYaml = {
  body: string | undefined;
  "body-file": string | undefined;
  "body-file-name": string | undefined;
  where: ConfigurationWhereClause;
};

async function fromConfigurationYaml(
  client: ClientType,
  bodyFilePrefix: string,
  raw: Map<string, ConfigurationYaml>,
): Promise<Configurations> {
  const configs: Configurations = new Map();

  await raw.forEach(async (config, name) => {
    const { where } = config;
    const bodyFileName = config["body-file-name"] ?? `${name}.md`;
    const bodyFile = config["body-file"] ?? `${bodyFilePrefix}${bodyFileName}`;
    const body = config.body
      ? config.body
      : await fetchRepoContent(client, bodyFile);

    configs.set(name, { where, body });
  });

  return configs;
}
