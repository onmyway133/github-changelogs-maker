const Rx = require('rxjs/Rx')
const Fetch = require('node-fetch')
const Minimist = require('minimist')
const Fs = require('fs')

const appName = require(__dirname + '/package.json').name

class Worker {
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
        console.log(json.data.repository.refs.edges[0].node.name)
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
        query
      })
    }
  }

  fetchTags() {
    const query = `
    query {
      repository(owner: "${this.owner}", name: "${this.repo}") {
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