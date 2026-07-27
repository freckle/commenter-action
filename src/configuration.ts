import * as core from "@actions/core";
import * as github from "@actions/github";
import * as yaml from "js-yaml";

import { fetchRepoContent, listRepoContent } from "./repo-content.js";
import { ConfigurationWhereClause } from "./where.js";

type ClientType = ReturnType<typeof github.getOctokit>;

export type Configuration = {
  name: string;
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

  core.info(`Found ${bodyFiles.size} body file(s) in prefix`);

  const map = loadConfigationYaml(configurationContent);
  return await fromConfigurationYaml(client, bodyFiles, map);
}

export type ConfigurationYaml = {
  body: string | undefined;
  "body-file": string | undefined;
  "body-file-name": string | undefined;
  where: ConfigurationWhereClause;
};

export function loadConfigationYaml(
  content: string,
): Map<string, ConfigurationYaml> {
  const obj = yaml.load(content) as object;
  return new Map(Object.entries(obj));
}

async function fromConfigurationYaml(
  client: ClientType,
  bodyFiles: Map<string, string>,
  raw: Map<string, ConfigurationYaml>,
): Promise<Configuration[]> {
  const configs: Configuration[] = [];

  for (const [name, config] of raw.entries()) {
    const body = await fromConfigurationBody(client, bodyFiles, name, config);

    if (body) {
      configs.push({ name, where: config.where, body });
    } else {
      core.warning(
        `Configuration ${name} without body will be ignored:\n${JSON.stringify({
          "body-file-name": config["body-file-name"],
          "body-file": config["body-file"],
        })}`,
      );
    }
  }

  // Add any frontmatter files
  fromFrontmatters(bodyFiles).forEach((x) => configs.push(x));

  return configs;
}

async function fromConfigurationBody(
  client: ClientType,
  bodyFiles: Map<string, string>,
  name: string,
  config: ConfigurationYaml,
): Promise<string | undefined> {
  // body given in yaml, use it
  if (config.body) {
    core.info("Using in-config body");
    return config.body;
  }

  // body-file given, may be anywhere in repository, fetch it
  if (config["body-file"]) {
    core.info(`Fetching ${config["body-file"]}`);
    return await fetchRepoContent(client, config["body-file"]);
  }

  // body-file-name (or default) is expected in the prefix directory, look
  // it up in the map we already have (ignore if not found)
  const bodyFileName = config["body-file-name"] ?? `${name}.md`;

  core.info(`Looking up ${bodyFileName} in prefix`);
  return bodyFiles.get(bodyFileName);
}

function fromFrontmatters(bodyFiles: Map<string, string>): Configuration[] {
  const configs: Configuration[] = [];

  for (const [path, content] of bodyFiles.entries()) {
    const name = `${path.replace(/\.md$/, "")}`;
    const { frontMatter, body } = splitFrontMatter(content);

    if (frontMatter) {
      const raw = yaml.load(frontMatter) as ConfigurationYaml;
      configs.push({ name, where: raw.where, body });
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
