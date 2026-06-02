import * as YAML from 'yaml';
import { readTextOrNull } from './fs';

/** Parse a YAML string into a JS value. Throws on syntax errors. */
export function parseYaml<T = unknown>(text: string): T {
  return YAML.parse(text) as T;
}

/** Read and parse a YAML file, or return null if the file is missing. */
export function readYaml<T = unknown>(p: string): T | null {
  const text = readTextOrNull(p);
  if (text === null) return null;
  return YAML.parse(text) as T;
}

/** Serialize a JS value to YAML text. */
export function stringifyYaml(value: unknown): string {
  return YAML.stringify(value);
}
