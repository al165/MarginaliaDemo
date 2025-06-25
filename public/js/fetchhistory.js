console.log("hello from fetchhistory.js");

const historyDiv = document.getElementById("room-history");

const history = JSON.parse(localStorage.getItem("history") || '{}');
console.log(history);

if (!history) {
    historyDiv.remove();
} else {
    historyDiv.innerHTML = '<em>Your rooms:</em>';
    const historyList = document.createElement('ul');
    for (const roomId of Object.keys(history)) {
        const { url, roomName } = history[roomId];
        const listItem = document.createElement('li');
        const roomLink = document.createElement('a');
        roomLink.href = url;
        roomLink.innerText = roomName;
        listItem.appendChild(roomLink);
        historyList.appendChild(listItem);
    }
    historyDiv.appendChild(historyList);
}