// @flow
import { ConversionTypeMap, generateConfig } from './commands/generate';
import { getVersion, createCommand } from './util';

function makeGenerateCommand(exitOverride: boolean) {
  // generate command
  const generate = createCommand(exitOverride, 'generate').description('Code generation utilities');

  const conversionTypes = Object.keys(ConversionTypeMap).join(', ');

  // generate config sub-command
  generate
    .command('config <filePath>')
    .description('Generate configuration from an api spec')
    .requiredOption(
      '-t, --type <value>',
      `the type of configuration to generate, options are [${conversionTypes}]`,
    )
    .option('-o, --output <path>', 'the output path')
    .action((filePath, opts) => generateConfig({ filePath, ...opts }));

  return generate;
}

export function go(args?: Array<string>, exitOverride?: boolean): void {
  if (!args) {
    args = process.argv;
  }

  createCommand(!!exitOverride)
    .version(getVersion(), '-v, --version')
    .description('A CLI for Insomnia!')
    .addCommand(makeGenerateCommand(!!exitOverride))
    .parse(args);
}
