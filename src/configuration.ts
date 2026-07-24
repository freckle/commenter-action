import * as github from "@actions/github";
import * as yaml from "js-yaml";

import { fetchRepoContent, listRepoContent } from "./repo-content.js";
import { ConfigurationWhereClause } from "./where.js";

type ClientType = ReturnType<typeof github.getOctokit>;

export type Configuration = {
  where: ConfigurationWhereClause;
  body: string;
};

export async function getConfigurations(
  client: ClientType,
  configurationPath: string,
  bodyFilePrefix: string,
): Promise<Configuration[]> {
  const configurationContent: string = await fetchRepoContent(
    client,
    configurationPath,
  );

  const bodyFiles: Map<string, string> = await listRepoContent(
    client,
    bodyFilePrefix,
  );

  const raw = yaml.load(configurationContent) as object;
  const map = new Map(Object.entries(raw));
  return await fromConfigurationYaml(client, bodyFiles, map);
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
): Promise<Configuration[]> {
  const configs: Configuration[] = [];

  for (const config of raw.values()) {
    const body = await fromConfigurationBody(client, bodyFiles, config);

    if (body) {
      configs.push({ where: config.where, body });
    }
  }

  // Add any frontmatter files
  fromFrontmatters(bodyFiles).forEach((x) => configs.push(x));

  return configs;
}

async function fromConfigurationBody(
  client: ClientType,
  bodyFiles: Map<string, string>,
  config: ConfigurationYaml,
): Promise<string | null> {
  // body given in yaml, use it
  if (config.body) {
    return config.body;
  }

  // body-file given, may be anywhere in repository, fetch it
  if (config["body-file"]) {
    return await fetchRepoContent(client, config["body-file"]);
  }

  // body-file-name (or default) is expected in the prefix directory, look
  // it up in the map we already have (ignore if not found)
  const bodyFileName = config["body-file-name"] ?? `${name}.md`;
  return bodyFiles.get(bodyFileName) ?? null;
}

function fromFrontmatters(bodyFiles: Map<string, string>): Configuration[] {
  const configs: Configuration[] = [];

  for (const content of bodyFiles.values()) {
    const { frontMatter, body } = splitFrontMatter(content);

    if (frontMatter) {
      const raw = yaml.load(frontMatter) as ConfigurationYaml;
      configs.push({ where: raw.where, body });
    }
  }

  return configs;
}

type Markdown = {
  frontMatter: string | null;
  body: string;
};

function splitFrontMatter(content: string): Markdown {
  return {
    frontMatter: null, // TODO
    body: content,
  };
}
