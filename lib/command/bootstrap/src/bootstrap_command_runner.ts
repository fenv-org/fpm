import { Traversal } from '../../../concurrency/mod.ts'
import { Context } from '../../../context/mod.ts'
import { DependencyGraph } from '../../../dart/mod.ts'
import { DError } from '../../../error/mod.ts'
import { Logger } from '../../../logger/mod.ts'
import { Workspace } from '../../../workspace/mod.ts'
import { PackageFilterOptions } from '../../common/mod.ts'
import { BootstrapOptions } from './bootstrap_command.ts'
import { writePubspecOverridesYamlFiles } from './bootstrap_pubspec_overrides.ts'
import { runFlutterPubGet } from './run_pub_get.ts'

export async function runBootstrapCommand(options: {
  context: Context
  workspace: Workspace
  flags: BootstrapOptions
}): Promise<void> {
  const { context, workspace, flags } = options
  const { logger } = context

  logger.stdout({ timestamp: true })
    .command('d bootstrap')
    .lineFeed()

  logger.stdout({ timestamp: true }).indent()
    .childArrow()
    .push((s) => s.cyan.bold(`workspace directory: ${workspace.workspaceDir}`))
    .lineFeed()
  logPackageFilters(logger, flags)

  const filteredWorkspace = await workspace.applyPackageFilterOptions(flags)
  const dependencyGraph = DependencyGraph.fromDartProjects(
    filteredWorkspace.dartProjects,
  )

  // Write pubspec_overrides.yaml files before running `flutter pub get`.
  await writePubspecOverridesYamlFiles(filteredWorkspace, dependencyGraph)

  // Run `flutter pub get` for each package.
  // We traverse the dependency graph in topological order.
  const commonArgs = { context, workspace }
  const flutterPubGetPerEachNode = (node: string) =>
    runFlutterPubGet(node, commonArgs)
  const traversal = Traversal.fromDependencyGraph(dependencyGraph, {
    onVisit: flutterPubGetPerEachNode,
  })

  try {
    await traversal.start()
  } catch (error) {
    throw new DError(`Failed to bootstrap with result: ${error}`)
  }
}

function logPackageFilters(logger: Logger, flags: PackageFilterOptions) {
  const filterDebugLogger = logger
    .stdout({ debug: true, timestamp: true })
    .indent(2)
  if (flags.includeHasFile) {
    filterDebugLogger
      .push('[package filter] include has file=')
      .push(JSON.stringify(flags.includeHasFile))
      .lineFeed()
  }
  if (flags.excludeHasFile) {
    filterDebugLogger
      .push('[package filter] exclude has file=')
      .push(JSON.stringify(flags.excludeHasFile))
      .lineFeed()
  }
  if (flags.includeHasDir) {
    filterDebugLogger
      .push('[package filter] include has directory=')
      .push(JSON.stringify(flags.includeHasDir))
      .lineFeed()
  }
  if (flags.excludeHasDir) {
    filterDebugLogger
      .push('[package filter] exclude has directory=')
      .push(JSON.stringify(flags.excludeHasDir))
      .lineFeed()
  }
}
