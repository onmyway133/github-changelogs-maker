#!/usr/bin/env node

const Rx = require('rxjs/Rx')
const Fetch = require('node-fetch')
const Minimist = require('minimist')
const Fs = require('fs')

const appName = require(__dirname + '/package.json').name

class GitHubInteractor {
  constructor(owner, repo, token) {
    this.owner = owner
    this.repo = repo
    this.token = token
    this.rootUrl = 'https://api.github.com/graphql'
  }

  makeObservable(query) {
    return Rx.Observable.create((observer) => {
      Fetch(this.rootUrl, this.makeOptions(query, this.token))
      .then(res => {
        return res.json()
      })
      .then((json) => {
        observer.next(json)
        observer.complete()
      })
      .catch((error) => {
        observer.error(error)
      })
    })
  }

  makeOptions(query, token) {
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${token}`
      },
      body: JSON.stringify({
        query: `
        query {
          repository(owner: "${this.owner}", name: "${this.repo}") {
            ${query}
          }
        }
        `
      })
    }
  }

  fetchReleases() {
    const query = `
    releases(last: 2) {
      edges {
        node {
          name
          createdAt
        }
      }
    }
    `

    return this.makeObservable(query)
    .map((json) => {
      const edges = json.data.repository.releases.edges
      const minDate = new Date()
      const maxDate = new Date()

      switch (edges.length) {
        case 1:
          return [
            minDate,
            edges[0].node.createdAt,
          ]
        case 2:
          return [
            new Date(edges[0].node.createdAt),
            new Date(edges[1].node.createdAt)
          ]
        default:
          return [
            minDate,
            maxDate
          ]
        }
    })
  }

  fetchPRsAndIssues(dates) {
    const query = `
    pullRequests(last: 100, orderBy: {field: UPDATED_AT, direction: ASC}) {
      edges {
        node {
          title
          merged
          mergedAt
          url
          author {
            login
            url
          }
        }
      }
    }
    issues(last: 100, orderBy: {field: UPDATED_AT, direction: ASC}) {
      edges {
        node {
          title
        	closed
          updatedAt
          url
        }
      }
    }
    `

    return this.makeObservable(query)
    .map((json) => {
      const pullRequests = json.data.repository.pullRequests.edges.filter((edge) => {
        if (!edge.node.merged) {
          return false
        }
  
        const date = new Date(edge.node.mergedAt)
        const isBetween = dates[0] <= date && date <= dates[1]
        return isBetween
      })

      const issues = json.data.repository.issues.edges.filter((edge) => {
        const date = new Date(edge.node.updatedAt)
        const isBetween = dates[0] <= date && date <= dates[1]
        return edge.node.closed && isBetween
      })

      return {
        pullRequests,
        issues
      }
    })
  }

  run() {
    return this.fetchReleases()
    .flatMap((dates) => {
      return this.fetchPRsAndIssues(dates)
    })
  }
}

class Storage {
  constructor() {
    this.path = require('os').homedir() + `/.${appName}`
    this.tokenPath = `${this.path}/token`
  }

  save(token) {
    if (!Fs.existsSync(this.path)) {
      Fs.mkdirSync(this.path)
    }

    Fs.writeFileSync(this.tokenPath, token, {
      encoding: 'utf-8'
    })
  }

  load(token) {
    if (!Fs.existsSync(this.tokenPath)) {
      return null
    }

    return Fs.readFileSync(this.tokenPath, {
      encoding: 'utf-8'
    })
  }
}

class ArgumentChecker {
  parseArguments() {
    const options = {
      '--': true
    }

    return Minimist(process.argv.slice(2))
  }

  check() {
    // Arguments
    let arg = this.parseArguments()

    // Storage
    const storage = new Storage()
    if (arg.token) {
      storage.save(arg.token)
    }
  
    const token = storage.load()
    if (!token) {
      console.log(`Please specify token, like this ${appName} --token=YOUR_TOKEN`)
      return null
    }
  
    if (!arg.owner || !arg.repo) {
      console.log(`Please specify owner and repo, like this ${appName} --owner=OWNER --repo=REPO`)
      return null
    }

    arg.token = token
    return arg
  }
}

class ChangelogGenerator {
  generate(json) {
    this.generatePRs(json.pullRequests)
    this.generateIssues(json.issues)
  }

  generatePRs(pullRequests) {
    if (pullRequests.length == 0) {
      return
    }

    console.log('Merged pull requests')
    pullRequests.forEach((pullRequest) => {
      const node = pullRequest.node
      console.log(`- ${node.title} ${node.url}, by [${node.author.login}](${node.author.url})`)
    })
  }

  generateIssues(issues) {
    if (issues.length == 0) {
      return
    }

    console.log('')

    console.log('Closed issues')
    issues.forEach((issue) => {
      console.log(`- ${issue.node.title} ${issue.node.url}`)
    })
  }
}

class Manager {
  run() {
    const arg = new ArgumentChecker().check()

    if (!arg) {
      return
    }

    const interactor = new GitHubInteractor(arg.owner, arg.repo, arg.token)
    interactor.run()
    .subscribe((json) => {
      new ChangelogGenerator().generate(json)
    }, (error) => {
      console.log(error)
    })
  }
}

new Manager().run()