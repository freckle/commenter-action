import * as core from "@actions/core";
import * as yaml from "js-yaml";

import { ConfigurationWhereClause } from "./where.js";
import { GitHub } from "./github.js";
import * as github from "./github.js";

export type Configuration = {
  name: string;
  where: ConfigurationWhereClause;
  body: string;
};

export async function getConfigurations(
  gh: GitHub,
  ref: string,
  configurationPath: string,
  bodyFilePrefix: string,
): Promise<Configuration[]> {
  const configurationContent: string = await github.fetchRepoContent(
    gh,
    ref,
    configurationPath,
  );

  const bodyFiles: Map<string, string> = await github.listRepoContent(
    gh,
    ref,
    bodyFilePrefix,
  );

  const map = loadConfigationYaml(configurationContent);
  return await fromConfigurationYaml(gh, ref, bodyFiles, map);
}

type ConfigurationYaml = {
  body: string | undefined;
  "body-file": string | undefined;
  "body-file-name": string | undefined;
  where: ConfigurationWhereClause;
};

function loadConfigationYaml(content: string): Map<string, ConfigurationYaml> {
  const obj = yaml.load(content) as object;
  return new Map(Object.entries(obj));
}

async function fromConfigurationYaml(
  gh: GitHub,
  ref: string,
  bodyFiles: Map<string, string>,
  raw: Map<string, ConfigurationYaml>,
): Promise<Configuration[]> {
  const configs: Configuration[] = [];

  for (const [name, config] of raw.entries()) {
    const body = await fromConfigurationBody(gh, ref, bodyFiles, name, config);

    if (body) {
      configs.push({ name, where: config.where, body });
    } else {
      core.warning(`Configuration ${name} without body will be ignored`);
    }
  }

  // Add any frontmatter files
  fromFrontmatters(bodyFiles).forEach((x) => {
    configs.push(x);
  });

  return configs;
}

async function fromConfigurationBody(
  gh: GitHub,
  ref: string,
  bodyFiles: Map<string, string>,
  name: string,
  config: ConfigurationYaml,
): Promise<string | undefined> {
  // body given in yaml, use it
  if (config.body) {
    return config.body;
  }

  // body-file given, may be anywhere in repository, fetch it
  if (config["body-file"]) {
    return await github.fetchRepoContent(gh, ref, config["body-file"]);
  }

  // body-file-name (or default) is expected in the prefix directory, look
  // it up in the map we already have (ignore if not found)
  const bodyFileName = config["body-file-name"] ?? `${name}.md`;
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
