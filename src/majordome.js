#!/usr/bin/env node

/**
 * "Majordome" (French for Butler...)
 *
 * @overview Github pull request notifications tool...
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { exec } = require('child_process')
const program = require('commander')
const chalk = require('chalk')
const Octokit = require('@octokit/rest')
const terminalLink = require('terminal-link')
const dayjs = require('dayjs')
const opn = require('opn')
const notifier = require('node-notifier')
const plist = require('plist')
const version = require('../package.json').version

const QUERY = 'type:pr is:open review:required review-requested:'

class GithubUtil {
  constructor () {
    this.client = this._getClient()
    this.user = null
  }

  _getClient () {
    const TOKEN = fs.readFileSync(
      path.join(os.homedir(), '.github'),
      'utf8'
    )
    return Octokit({
      auth: TOKEN.trim(),
      userAgent: `Majordome/${version}`
    })
  }

  async getUser () {
    if (this.user !== null) {
      return this.user
    }
    const user = await this.client.users.getAuthenticated()
    this.user = user.data.login
    return this.user
  }

  async search () {
    const results = await this.client.search.issuesAndPullRequests({
      q: `${QUERY}${await this.getUser()}`
    })
    return results
  }
}

function getRepoFromUrl (url) {
  const matches = [...url.match(/\/repos\/(.+?)\/(.+?)$/)]
  return {
    name: matches[2],
    owner: matches[1]
  }
}

function getAge (date) {
  return dayjs().diff(date, 'days')
}

function print (msg) {
  console.log(msg)
}

program
  .version(version)

program
  .command('check')
  .description('check for open pull requests requiring a review')
  .action(async () => {
    const gh = new GithubUtil()
    const results = await gh.search()
    const count = results.data.total_count

    if (count > 0) {
      notifier.notify({
        title: 'Github Pull Requests',
        message: `You have ${count} pull requests awaiting review`,
        icon: path.join(__dirname, '../assets/icon.png'),
        wait: true
      })

      notifier.on('click', async (no, options, event) => {
        opn(`https://github.com/search?q=${QUERY}${await gh.getUser()}`)
      })
    }
  })

program
  .command('list')
  .description('display all open pull requests requiring a review')
  .action(async () => {
    const gh = new GithubUtil()
    const results = await gh.search()
    const repos = {}

    for (const item of results.data.items) {
      const repo = getRepoFromUrl(item.repository_url)
      const repoKey = `${repo.owner}/${repo.name}`
      const pullRequest = await gh.client.pulls.get({
        owner: repo.owner,
        repo: repo.name,
        pull_number: item.number
      })

      const output = {
        title: pullRequest.data.title,
        url: pullRequest.data.html_url,
        updated: pullRequest.data.updated_at
      }

      if (repos[repoKey]) {
        repos[repoKey].push(output)
      } else {
        repos[repoKey] = [output]
      }
    }

    Object.entries(repos).forEach(([repo, prs]) => {
      print(chalk.bold.inverse(`[${repo}]`))

      prs.forEach((pr) => {
        const age = getAge(pr.updated)

        if (terminalLink.isSupported) {
          const link = terminalLink(`${pr.title} (${age} days)`, pr.url)
          print(link)
        } else {
          print(`${pr.title} - ${age} days - ${pr.url}`)
        }
      })

      console.log()
    })
  })

program
  .command('osx-install')
  .description('install a schedule to trigger "check" command')
  .option('-i, --interval <number>', 'Interval in seconds between checks', 3600)
  .action(async (options) => {
    const key = 'dev.nicksnell.majordome'
    const lauchctrlFile = path.join(
      os.homedir(),
      `Library/LaunchAgents/${key}.plist`
    )
    const plistOutput = {
      'Label': key,
      'ProgramArguments': [
        process.execPath,
        __filename,
        'check'
      ],
      'StartInterval': parseInt(options.interval)
    }
    const plistXml = plist.build(plistOutput)
    fs.writeFileSync(lauchctrlFile, plistXml)

    const cmd = `launchctl load -w ${lauchctrlFile}`
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(`Unable to install startup script: ${err}`)
      } else {
        print(cmd)
        print(chalk.green(
          `Installed, running every ${options.interval} seconds`))
      }
    })
  })

program.parse(process.argv)
