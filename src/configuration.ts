import * as github from "@actions/github";
import * as yaml from "js-yaml";

import { fetchRepoContent, listRepoContent } from "./repo-content.js";
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
  const bodyFiles: Map<string, string> = await listRepoContent(
    client,
    bodyFilePrefix,
  );

  const configurationContent: string = await fetchRepoContent(
    client,
    configurationPath,
  );

  const raw = yaml.load(configurationContent) as Map<string, ConfigurationYaml>;
  return await fromConfigurationYaml(client, bodyFiles, raw);
}

type ConfigurationYaml = {
  body: string | undefined;
  "body-file": string | undefined;
  "body-file-name": string | undefined;
  where: ConfigurationWhereClause;
};

async function fromConfigurationYaml(
  client: ClientType,
  bodyFiles: Map<string, string>,
  raw: Map<string, ConfigurationYaml>,
): Promise<Configurations> {
  const configs: Configurations = new Map();

  await Object.entries(raw).forEach(async ([name, config]) => {
    const { where } = config;

    if (config.body) {
      // Body given in yaml, use it
      configs.set(name, { where, body: config.body });
      return;
    }

    if (config["body-file"]) {
      // body-file given, may be anywhere in repository, fetch it
      const body = await fetchRepoContent(client, config["body-file"]);
      configs.set(name, { where, body });
      return;
    }

    // body-file-name (or default) is expected in the prefix directory, look it
    // up in the map we already have (ignore if not found)
    const bodyFileName = config["body-file-name"] ?? `${name}.md`;
    const body = bodyFiles.get(bodyFileName);

    if (body) {
      configs.set(name, { where, body });
      return; // unnecessary, but in case we refactor later
    }
  });

  return configs;
}
