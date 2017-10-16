const Rx = require('rxjs/Rx')
const Fetch = require('node-fetch')
const Minimist = require('minimist')
const Fs = require('fs')

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

class Storage {
  constructor() {
    const name = require(__dirname + '/package.json').name
    this.path = require('os').homedir() + `/.${name}`
  }

  save(token) {
    if (!Fs.existsSync(this.path)) {
      Fs.mkdirSync(this.path)
    }

    Fs.writeFileSync(this.path + '/token', token)
  }

  load(token) {
    return Fs.readFileSync(this.path)
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

    // Storage
    const storage = new Storage()
    if (arg.token) {
      storage.save(arg.token)
    }
    

    const worker = new Worker(arg.owner, arg.repo, arg.token)
    worker.fetchTags().subscribe(
      function (json) {
        
      }
    )
  }
}

new Manager().run()