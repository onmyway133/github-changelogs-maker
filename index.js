const Rx = require('rxjs/Rx')
const Fetch = require('node-fetch')

class Worker {
  constructor(owner, repo) {
    this.owner = owner
    this.repo = repo
    this.rootUrl = 'https://api.github.com/graphql'
  }

  makeOptions(query) {
    return {
      method: 'POST',
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
      .then(res => res.text())
      .then((json) => {
        console.log(json)
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
  run() {
    const worker = new Worker('hyperoslo', 'Cache')
    worker.fetchTags().subscribe(
      function (json) {
        console.log(json)
      }
    )
  }
}

new Manager().run()