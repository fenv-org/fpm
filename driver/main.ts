type FPM = {
  fpm: (args: string[]) => void | Promise<void>
}

const DEBUG_FLAG = '--debug'

async function main() {
  const debug = Deno.args.includes(DEBUG_FLAG)
  if (debug) {
    console.error(`Running in "release" mode`)
  }

  const libPath: string = getLibPath()
  const { fpm }: FPM = await import(libPath)
  const voidOrPromise = fpm(Deno.args)
  if (voidOrPromise instanceof Promise) {
    await voidOrPromise
  }
}

function getLibPath(): string {
  const version = 'main'
  return `https://raw.githubusercontent.com/fenv-org/fpm/${version}/lib/fpm.ts`
}

main()
