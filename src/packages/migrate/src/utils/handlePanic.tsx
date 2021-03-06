import { Box, Color, Instance, render } from 'ink'
import Spinner from 'ink-spinner'
const AnySpinner: any = Spinner
import {
  BorderBox,
  DummySelectable,
  ErrorBox,
  InkLink,
  TabIndexContext,
  TabIndexProvider,
} from '@prisma/ink-components'
import chalk from 'chalk'
import React, { useContext, useState } from 'react'
import { Link } from './Link'
import { RustPanic, sendPanic } from '@prisma/sdk'
import isCi from 'is-ci'

export async function handlePanic(
  error: RustPanic,
  cliVersion: string,
  binaryVersion: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let app: Instance | undefined

    if (!process.stdout.isTTY || isCi || process.env.GITHUB_ACTIONS) {
      reject(error)
      return
    }

    const onDone = async () => {
      if (app) {
        app.unmount()
        app.waitUntilExit()
      }

      process.exit(1)
    }

    app = render(
      <TabIndexProvider>
        <PanicDialog
          error={error}
          onDone={onDone}
          cliVersion={cliVersion}
          binaryVersion={binaryVersion}
        />
      </TabIndexProvider>,
    )
  })
}

interface DialogProps {
  error: RustPanic
  cliVersion: string
  binaryVersion: string
  onDone: () => void
}

const PanicDialog: React.FC<DialogProps> = ({
  error,
  onDone,
  cliVersion,
  binaryVersion,
}) => {
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [errorId, setErrorId] = useState<number | null>(null)
  const [sendingError, setSendingError] = useState(false)
  const tabIndexContext = useContext(TabIndexContext)

  const onSubmit = async (submit: boolean) => {
    // upload this
    if (!submit) {
      process.exit(1)
    }
    setSending(true)
    const id = await sendPanic(error, cliVersion, binaryVersion)
    if (id) {
      setErrorId(id)
    } else {
      setSendingError(true)
    }
    setDone(true)
    onDone()
  }

  return (
    <Box flexDirection="column">
      {done ? (
        <>
          <Color red>
            {error.message
              .split('\n')
              .slice(0, process.stdout.rows - 20)
              .join('\n')}
          </Color>
          {sendingError ? (
            <>
              <Color bold red>
                Oops. We could not send the error report.
              </Color>
              {errorId && (
                <Box flexDirection="column">
                  <Box>
                    To help us still receive this error, please create an issue
                    in{' '}
                    <InkLink url="https://github.com/prisma/prisma/issues/new" />
                  </Box>
                </Box>
              )}
            </>
          ) : (
            <>
              <Color bold>We successfully received the error report</Color>
              {errorId && (
                <Box flexDirection="column">
                  <Box>
                    To help us even more, please create an issue at{' '}
                    <InkLink url="https://github.com/prisma/prisma/issues/new" />
                  </Box>
                  <Box>
                    mentioning the{' '}
                    <Color underline>
                      report id <Color bold>{errorId}</Color>
                    </Color>
                    .
                  </Box>
                </Box>
              )}
            </>
          )}
          <Box marginTop={1}>
            <Color bold>Thanks a lot for your help! 🙏</Color>
          </Box>
        </>
      ) : (
        <>
          <ErrorBox>Oops, an unexpected error occured!</ErrorBox>
          <Color red>
            {error.message
              .split('\n')
              .slice(0, process.stdout.rows - 20)
              .join('\n')}
          </Color>
          <Color bold>
            Please help us improve Prisma 2 by submitting an error report.
          </Color>
          <Color bold>
            Error reports never contain personal or other sensitive information.
          </Color>
          <Color dim>
            Learn more: <InkLink url="https://pris.ly/d/telemetry" />
          </Color>
          <BorderBox
            flexDirection="column"
            title={chalk.bold('Submit error report')}
            marginTop={1}
          >
            {sending ? (
              <DummySelectable tabIndex={0}>
                <Color cyan>
                  <AnySpinner /> Submitting error report
                </Color>
              </DummySelectable>
            ) : (
              <Link
                label="Yes"
                description={`Send error report once`}
                tabIndex={0}
                onSelect={() => onSubmit(true)}
              />
            )}
            <Link
              label="No"
              description={`Don't send error report`}
              tabIndex={1}
              onSelect={() => onSubmit(false)}
            />
          </BorderBox>
        </>
      )}
    </Box>
  )
}
