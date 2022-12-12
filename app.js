import express from 'express';
import fetch from 'node-fetch';
import redis from 'redis';
//I used ES module syntax, because node-fetch from v3 is an ESM-only module

const PORT = process.eventNames.PORT || 3000;
const REDIS_PORT = process.env.PORT || 6379;

const client = redis.createClient({
  legacyMode: true,
  PORT: REDIS_PORT,
});
client.connect().catch(console.error);

const app = express();

function setResponse(username, repos) {
  return `<h2>${username} has ${repos} in github</h2>`;
}

async function getRepos(req, res, next) {
  try {
    console.log('Requesting Data...');
    const { username } = req.params;
    const url = `https://api.github.com/users/${username}`;

    const response = await fetch(url);
    const data = await response.json();

    const repos = data.public_repos;
    client.setEx(username, 3600, repos);

    console.log('Saved in Redis');
    res.send(setResponse(username, repos));
  } catch (error) {
    console.error(error);
    res.status(500);
  }
}

function cache(req, res, next) {
  const { username } = req.params;
  client.get(username, (err, data) => {
    if (err) throw err;
    if (data !== null) {
      console.log('Retrieved from cache');
      res.send(setResponse(username, data));
    } else {
      next();
    }
  });
}

app.get('/repos/:username', cache, getRepos);

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
