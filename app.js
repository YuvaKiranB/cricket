const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const path = require("path");

const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;

const startDB = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

startDB();

function getCamelCase1(player) {
  return {
    playerId: player.player_id,
    playerName: player.player_name,
  };
}

function getCamelCase2(match) {
  return {
    matchId: match.match_id,
    match: match.match,
    year: match.year,
  };
}

function getCamelCase3(playerScores) {
  return {
    playerId: playerScores.player_id,
    playerName: playerScores.player_name,
    totalScore: playerScores.score,
    totalFours: playerScores.fours,
    totalSixes: playerScores.sixes,
  };
}

app.get("/players/", async (request, response) => {
  const getPlayers = `
    SELECT *
    FROM player_details
    ORDER BY player_id;`;
  const players = await db.all(getPlayers);
  response.send(
    players.map((player) => {
      return getCamelCase1(player);
    })
  );
});

app.get("/players/:playerId", async (request, response) => {
  const { playerId } = request.params;
  const getPlayer = `
    SELECT *
    FROM player_details
    WHERE player_id = ${playerId};`;
  const player = await db.get(getPlayer);
  response.send(getCamelCase1(player));
});

app.put("/players/:playerId", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const writePlayer = `
    UPDATE player_details
    SET
    player_name = "${playerName}"
    WHERE player_id = ${playerId};`;
  await db.run(writePlayer);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId", async (request, response) => {
  const { matchId } = request.params;
  const getMatch = `
    SELECT *
    FROM match_details
    WHERE match_id = ${matchId};`;
  const match = await db.get(getMatch);
  response.send(getCamelCase2(match));
});

app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getMatches = `
  SELECT *
  FROM (match_details INNER JOIN player_match_score ON match_details.match_id = player_match_score.match_id)
  WHERE player_match_score.player_id = ${playerId};`;
  const matches = await db.all(getMatches);
  response.send(
    matches.map((match) => {
      return getCamelCase2(match);
    })
  );
});

app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const getPlayers = `
  SELECT *
  FROM (player_details INNER JOIN player_match_score ON player_details.player_id = player_match_score.player_id)
  WHERE player_match_score.match_id = ${matchId};`;
  const players = await db.all(getPlayers);
  response.send(
    players.map((player) => {
      return getCamelCase1(player);
    })
  );
});

app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScores = `
  SELECT 
  player_details.player_id,
  player_name,
  SUM(score) AS score,
  SUM(fours) AS fours,
  SUM(sixes) AS sixes
  FROM (player_match_score INNER JOIN player_details ON player_match_score.player_id = player_details.player_id)
  WHERE player_match_score.player_id = ${playerId};`;
  const playerScores = await db.get(getPlayerScores);
  response.send(getCamelCase3(playerScores));
});

module.exports = app;
