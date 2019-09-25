#!/usr/bin/env node

/**
 * "Majordome" (French for Butler...)
 *
 * @overview Github pull request notifications tool...
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const program = require('commander')
const chalk = require('chalk')
const Octokit = require('@octokit/rest')
const terminalLink = require('terminal-link')
const dayjs = require('dayjs')
const notifier = require('node-notifier')
const version = require('../package.json').version

function getClient () {
  const TOKEN = fs.readFileSync(
    path.join(os.homedir(), '.github'),
    'utf8'
  )
  return Octokit({
    auth: TOKEN.trim(),
    userAgent: `Majordome/${version}`
  })
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

async function search (octokit=null) {
  if (!octokit) {
    octokit = getClient()
  }
  const user = await octokit.users.getAuthenticated()
  const loginName = user.data['login']

  const results = await octokit.search.issuesAndPullRequests({
    q: `type:pr is:open review:required review-requested:${loginName}`
  })

  return results
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
    const results = await search()
    const count = results.data.total_count

    if (count > 0) {
      notifier.notify({
        title: 'Github Pull Requests',
        message: `You have ${count} pull requests awaiting review`,
        icon: path.join(__dirname, '../assets/icon.png'),
        wait: false,
      })
    }
  })

program
  .command('list')
  .description('display all open pull requests requiring a review')
  .action(async () => {
    const octokit = getClient()
    const results = await search(octokit)
    const repos = {}

    for (const item of results.data.items) {
      const repo = getRepoFromUrl(item.repository_url)
      const repoKey = `${repo.owner}/${repo.name}`
      const pullRequest = await octokit.pulls.get({
        owner: repo.owner,
        repo: repo.name,
        pull_number: item.number
      })

      const output = {
        title: pullRequest.data.title,
        url: pullRequest.data.html_url,
        updated: pullRequest.data.updated_at,
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

program.parse(process.argv)
