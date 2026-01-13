const { Octokit } = require("@octokit/rest");

const { utils, align_username, align } = require("./utils")

const token = process.env.GHT

const octokit = new Octokit({
    auth: token,
    log: {
        debug: () => { },
        info: () => { },
        warn: console.warn,
        error: console.error,
    },
});

function dateDiffInDays(date) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    const utc1 = Date.now();
    const b = new Date(date)
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((utc1 - utc2) / _MS_PER_DAY);
}

class GithubUser {
    constructor(username) {
        this.userName = username;
    }

    async getCommits() {
        let res = await octokit.search.commits({
            q: `author:${this.userName}`
        })
        return res.data.total_count
    }

    async getIssueAndPr(type) {
        let res = await octokit.search.issuesAndPullRequests({
            q: `type:${type} author:${this.userName}`
        })
        return res.data.total_count
    }

    async fetchContent() {
        // Dados gerais do usuário
        this.userContent = await octokit.request("GET /users/{username}", {
            username: this.userName,
        });

        // Buscar todos os repositórios do usuário (paginado)
        const allRepos = await octokit.paginate(
            "GET /users/{username}/repos",
            {
                username: this.userName,
                type: "owner", // repositórios que você possui
                per_page: 100
            }
        );

        this.repoContent = allRepos;

        // Contar forks corretamente
        this.forkCount = allRepos.filter(repo => repo.fork === true).length;

        // Contar stars
        this.starsCount = allRepos.reduce((acc, repo) => acc + repo.stargazers_count, 0);

        // Outros dados
        this.name = this.userContent.data.name;
        this.repo = align(this.userContent.data.public_repos);
        this.gists = align(this.userContent.data.public_gists);
        this.followers = align(this.userContent.data.followers);
        this.createdAt = dateDiffInDays(this.userContent.data.created_at);

        this.commitsCount = await this.getCommits();
        this.issueCount = await this.getIssueAndPr('issue');
        this.prCount = await this.getIssueAndPr('pr');

        this.stars = align(this.starsCount);
        this.forks = align(this.forkCount);
        this.commits = align(this.commitsCount);
        this.issues = align(this.issueCount);
        this.pr = align(this.prCount);
        this.uptime = this.createdAt;
        this.username = align_username(this.userName);
    }
}

module.exports = { GithubUser }
