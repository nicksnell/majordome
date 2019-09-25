/**
 * "Majordome" (French for Butler...)
 *
 * Github pull request notifications...
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
  const TOKEN = fs.readFileSync(path.join(os.homedir(), '.github'), 'utf8')
  return Octokit({
    auth: TOKEN.trim(),
    userAgent: `Mayordomo/${version}`
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

async function search () {
  const octokit = getClient()
  const user = await octokit.users.getAuthenticated()
  const loginName = user.data['login']

  const results = await octokit.search.issuesAndPullRequests({
    q: `type:pr is:open review:required review-requested:${loginName}`
  })

  return results
}

program
  .version(version)

program
  .command('check')
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
  .action(async () => {
    const results = await search()
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
      console.log(chalk.bold.inverse(`[${repo}]`))

      prs.forEach((pr) => {
        const age = getAge(pr.updated)

        if (terminalLink.isSupported) {
          const link = terminalLink(`${pr.title} (${age} days)`, pr.url)
          console.log(link)
        } else {
          console.log(`${pr.title} - ${age} days - ${pr.url}`)
        }
      })

      console.log()
    })
  })

program.parse(process.argv)
