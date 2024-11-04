const tokenInput = document.getElementById("tokenInput");
const errormessage = document.getElementById("errormessage");
const rmcdiv = document.getElementById("rmc");
const timer = document.getElementById("timer");
const scoreCounter = document.getElementById("score")
const trackDisplay = document.getElementById("trackDisplay");
const stats = document.getElementById("stats");
const controls = document.getElementById("controls");
const positions = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
const totalTime = 1200;
let validToken = false;
let fetchedAccount = {};
let tracks = [];
let trackIndex = 0;
let score = 0;
let freeskips = 1;
let skips = 0;

let skipping = false;


async function fetchTracks() {
    let done = false
    let j = 0;
    while (done == false) {
        let fetches = [];
        for (let i = 0; i < 50; i++) {
        // for (let i = 0; i < 10; i++) {
            fetches.push(
                fetch("https://api.dashcraft.io/trackv2/global3?sort=new&verifiedOnly=false&page=" + (j * 50 + i) + "&pageSize=50")
                .then((response) => response.json())
                .then((json) => {
                    // progress += 1;
                    // loadingProgress.innerHTML = "Fetching IDs... (" + progress * 50 + ")";
                    return json.tracks;
                }));
        }
        const result = await Promise.all(fetches)
        // done = true
        if (result[result.length - 1].length < 50) {
            done = true
        }
        for (let i = 0; i < result.length; i++) {
            tracks = tracks.concat(result[i]);
        }
        j += 1
    }
    return true;
}



tokenInput.addEventListener("input", async function() {
    if (tokenInput.value.length == 172 && tokenInput.value.startsWith("eyJ")) {
        token = tokenInput.value;
        tokenInput.readOnly = true;
        errormessage.innerHTML = "Fetching account...";
        accountFetch = fetch("https://api.dashcraft.io/auth/account", { 
                headers: {
                    'Authorization': token
                }
            })
            
            .then((response) => response.json())
            .then((json) => {
                json.token = token;
                return json;
            })
            .catch(error => {
                return false;
            })


        fetchedAccount = await accountFetch;
        console.log(fetchedAccount)
        if (fetchedAccount != false) {
            validToken = true;
            errormessage.innerHTML = "Account found: " + playerHTML(fetchedAccount);
        } else {
            errormessage.innerHTML = "Invalid token";
        }
        tokenInput.readOnly = false

    } else if (tokenInput.value.length == 0) {
        errormessage.innerHTML = "<br>";
    } else {
        errormessage.innerHTML = "Invalid token";
        validToken = false;
    }
})


function playerHTML(playerdata) {
    let playerhtml = ""
    playerhtml = "<img src='leagues/" + (playerdata.leagueNr + 1) + ".png' style='width: 14px; height: 14px'>"
    playerhtml += " <a href='https://dashcraft.io/?u=" + playerdata._id + "' target='_blank' style='color: white;'>"
    playerhtml += playerdata.username + "</a>"
    return playerhtml;
  }


async function startRMC() {
    if (validToken == true) {
        setup.hidden = true;
        await fetchTracks();

        rmcdiv.hidden = false;
        tokenInput.readOnly = true;
        console.log(tokenInput.value);
        const startTime = Date.now();
        clock = setInterval(function() {
            timeInSeconds = totalTime - Math.round((Date.now() - startTime)/1000);
            timer.innerHTML = Math.floor(timeInSeconds/60).toString().padStart(2, '0') + ":" + (timeInSeconds%60).toString().padStart(2, '0');
            scoreCounter.innerHTML = "Points: " + score + "<br>Skips: " + skips + "<br>Free skips remaining: " + freeskips

            if (Math.round(timeInSeconds) <= 0) {
                timer.innerHTML = "00:00"
                clearInterval(clock);
            }
        }, 100)


        
        console.log("https://dashcraft.io/?t=" + tracks[trackIndex]._id);
        
        trackIndex = getRandomInt(tracks.length)
        await updateTrack(tracks[trackIndex], true)
        while (Date.now() - startTime < totalTime * 1000) {
            sleep = new Promise(resolve => setTimeout(resolve, 5000))
            await updateTrack(tracks[trackIndex], false)
            await sleep;
        }
    }
}


async function updateTrack(track, initialfetch) {
    
    leaderboardFetch = fetch("https://api.dashcraft.io/trackv2/" + track._id + "/leaderboard", { 
        headers: {
            'Authorization': token
        }
    })
    
        .then((response) => response.json())
        .then((json) => {
            return json;
        })
        .catch(error => {
            return false;
        })
    
    fetchedLeaderboard = await leaderboardFetch;
    

    target = {position: Math.floor(fetchedLeaderboard.totalEntries/20)}
    if (target.position >= 10) {
        target.time = "Unknown time"
        gold = Math.ceil(fetchedLeaderboard.leaderboard[9] * 1.05);
    } else if (fetchedLeaderboard.totalEntries == 0) {
        target.time = "Any time"
        gold = false;
    } else {
        target.time = fetchedLeaderboard.leaderboard[target.position].time
        gold = Math.ceil(target.time * 1.05);
    }




    if (skipping) {
        console.log(fetchedLeaderboard.myBest)
        if ((fetchedLeaderboard.hasOwnProperty("myBest") && fetchedLeaderboard.myBest.time <= gold) || gold == false) {
            trackIndex = getRandomInt(tracks.length);
            updateTrack(tracks[trackIndex], true);
            console.log("gold skipped " + track._id);
            skips += 1
        } else if (freeskips > 0) {
            trackIndex = getRandomInt(tracks.length);
            updateTrack(tracks[trackIndex], true);
            console.log("free skipped " + track._id);
            freeskips -= 1;
            skips += 1
        } else {
            console.log("no free skips left");
        }
        skipping = false;
    }
    




    if ((fetchedLeaderboard.hasOwnProperty("myBest") && fetchedLeaderboard.myBest.place <= target.position) || target.time > 90) {
        if (!initialfetch) {
            console.log("finished " + track._id)
            score += 1
        } else {
            console.log("auto-skipped " + track._id)
        }
        trackIndex = getRandomInt(tracks.length)
        updateTrack(tracks[trackIndex], true)
        return
    }
    trackDisplay.innerHTML = showTrack(tracks[trackIndex])
    

    html = ""
    html += "Target: " + positions[target.position] + " (" + target.time + ")<br>"
    if (gold == false) {
        html += "Gold skip: free<br>"
    } else {
        html += "Gold skip: " + gold + ".00<br>";
    }
    if (fetchedLeaderboard.hasOwnProperty("myBest")) {
        html += "Current: " + positions[fetchedLeaderboard.myBest.place] + " (" + fetchedLeaderboard.myBest.time + ")<br>"
    } else {
        html += "Current: N/A<br>"
    }
    stats.innerHTML = html
    console.log(fetchedLeaderboard)
}


function showTrack(track) {
    html = ""
    html += '<a target="_blank" href="https://dashcraft.io/?t=' + track._id + '">'
    html += '<img src="https://cdn.dashcraft.io/v2/prod/track-thumbnail/sm/' + track._id + '.jpg?v=4">'
    html += '<div class="desc">' + playerHTML(track.user)
    html += '<br><img src = "like.png"style="width: 14px; height: 14px"> ' + track.likesCount + '/' + track.dislikesCount
    return html
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}
