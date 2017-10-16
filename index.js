const Rx = require('rxjs/Rx')
const Fetch = require('node-fetch')
const Minimist = require('minimist')
const Fs = require('fs')

const appName = require(__dirname + '/package.json').name

class Worker {
  constructor(owner, repo, token) {
    this.owner = owner
    this.repo = repo
    this.rootUrl = 'https://api.github.com/graphql'
    this.token = this.token
  }

  makeObservable(query) {
    return Rx.Observable.create((observer) => {
      Fetch(this.rootUrl, this.makeOptions(query))
      .then(res => {
        return res.text()
      })
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

    return this.makeObservable(query)
  }

  fetchPRs() {

  }

  fetchIssues() {
    
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

    Fs.writeFileSync(this.tokenPath)
  }

  load(token) {
    return Fs.readFileSync(this.tokenPath)
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
    const arg = this.parseArguments()

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

    return arg
  }
}

class Manager {
  run() {
    const arg = new ArgumentChecker().check()

    if (!arg) {
      return
    }

    const worker = new Worker(arg.owner, arg.repo, arg.token)
    worker.fetchTags().subscribe(
      function (json) {
        
      }
    )
  }
}

new Manager().run()