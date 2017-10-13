const Rx = require('rxjs/Rx')
const Fetch = require('node-fetch')
const Minimist = require('minimist')

class Worker {
  constructor(owner, repo, token) {
    this.owner = owner
    this.repo = repo
    this.rootUrl = 'https://api.github.com/graphql'
    this.token = this.token
  }

  makeOptions(query) {
    return {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${this.token}`
      },
      body: {
        query
      }
    }
  }

  fetchTags() {
    const query = `
    query {
      repository(owner: ${this.owner}, name: ${this.repo}) {
        refs(refPrefix: "refs/tags/", last: 2) {
          edges {
            node {
              name
            }
          }
        }
      }
    }
    `

    return Rx.Observable.create((observer) => {
      Fetch(this.rootUrl, this.makeOptions(query))
      .then(res => {
        return res.text()
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

  fetchPRs() {

  }

  fetchIssues() {
    
  }
}

class Manager {
  parseArguments() {
    const options = {
      '--': true
    }

    return Minimist(process.argv.slice(2))
  }

  run() {
    // Arguments
    const arg = this.parseArguments()
    console.log(arg)

    const worker = new Worker(arg.owner, arg.repo, arg.token)
    worker.fetchTags().subscribe(
      function (json) {
        
      }
    )
  }
}

new Manager().run()