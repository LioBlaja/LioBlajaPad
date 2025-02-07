const socket = io(); // Establishes connection with the Socket.io server
// The io() function automatically connects the client to the Socket.io server that is running on the same domain and port from which the page was served. It will try to connect to http://localhost:5000 (or the appropriate server URL).
socket.on('connect', () => {
    console.log("Client connected to server via Socket.io");
    fetch('/getTextFromServer', {
        method: 'GET'
    })
        .then(res => res.json())
        .then(data => {
            console.log(`DATA: ${data.message}`);
            document.getElementById("display-text").value = data.message;
        })
        .catch(err => {
            console.error("Error:", err);
        });

    fetch('/getFilesFromServer', {
        method: 'GET'
    })
        .then(res => res.json())
        .then(data => {
            console.log(`DATA: ${data.files}`);

            for (let i = 0; i < data.files.length; i++) {
                const fileList = document.getElementById("file-list");

                const fileName = data.files[i];

                const listItem = document.createElement("li");
                listItem.innerHTML = `
                <div>
                    <span>${fileName}</span>
                </div>
                `;
                // listItem.innerHTML = `
                // <div>
                //     <span>${fileName}</span>
                //     <button class="download-file">Download</button>
                //     <button class="delete-file">Delete</button>
                // </div>
                // `;

                // const downloadButton = listItem.querySelector(".download-file");
                // downloadButton.addEventListener('click', () => {
                //     // Implement the logic to download the file
                //     console.log(`Download ${fileName}`);
                // });

                // const deleteButton = listItem.querySelector(".delete-file");
                // deleteButton.addEventListener('click', () => {
                //     // Implement the logic to delete the file
                //     console.log(`Delete ${fileName}`);
                //     fileList.removeChild(listItem);
                // });

                fileList.appendChild(listItem);
            }
        })
        .catch(err => {
            console.error("Error:", err);
        });
});

socket.on('disconnect', () => {
    console.log("Client disconnected from server");
});

socket.on('textUpdated', (data) => {
    document.getElementById("display-text").value = data.text;
});

socket.on('filesDeleteAll', (data) => {
    const fileList = document.getElementById("file-list");
    while (fileList.firstChild) {
        fileList.removeChild(fileList.firstChild);
    }
});

socket.on('filesUpdated', (data) => {
    console.log(`RECEIVED FILES DATA:${data.files}`);

    const fileList = document.getElementById("file-list");
    const existingFiles = Array.from(fileList.getElementsByTagName("span")).map(span => span.textContent);

    const filesArray = data.files;

    filesArray.forEach(fileName => {
        if (!existingFiles.includes(fileName)) {
            const listItem = document.createElement("li");
            // listItem.innerHTML = `
            // <div>
            //     <span>${fileName}</span>
            //     <button class="download-file">Download</button>
            //     <button class="delete-file">Delete</button>
            // </div>
            // `;
            listItem.innerHTML = `
            <div>
                <span>${fileName}</span>
            </div>
            `;

            // const downloadButton = listItem.querySelector(".download-file");
            // downloadButton.addEventListener('click', () => {
            //     console.log(`Download ${fileName}`);
            // });

            // const deleteButton = listItem.querySelector(".delete-file");
            // deleteButton.addEventListener('click', () => {
            //     console.log(`Delete ${fileName}`);
            //     fileList.removeChild(listItem);
            // });

            fileList.appendChild(listItem);
        }
    });
});

const saveTextButton = document.getElementById("save-text");
const deleteTextButton = document.getElementById("delete-text");
const uploadFileButton = document.getElementById("upload-file");

saveTextButton.addEventListener('click', () => {
    const textToSend = document.getElementById("new-text").value;
    if (textToSend.length <= 0) {
        alert("Please enter some text before saving.");
        return;
    }

    document.getElementById("display-text").value = textToSend;
    fetch("/updateTextFromServer", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: textToSend })
    })
        .then(res => res.json()).then(data => console.log(data)).catch(err => console.error("ERROR:", err));
});

deleteTextButton.addEventListener('click', () => {

    document.getElementById("display-text").value = '';

    fetch("/updateTextFromServer", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: '' })
    })
        .then(res => res.json()).then(data => console.log(data)).catch(err => console.error("ERROR:", err));

});

uploadFileButton.addEventListener('click', () => {
    const fileInput = document.getElementById("file-input");
    if (fileInput.files.length === 0) {
        alert("Please select a file before uploading.");
        return;
    }

    const formData = new FormData();
    const files = document.getElementById("file-input").files;

    for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
    }

    fetch('/uploadFilesOnServer', {
        method: 'POST',
        body: formData
    }).then(res => res.json()).then(data => {
        console.log(data);
    }).catch(err => console.error("Error:", err));
})

const deleteAllFillesButton = document.getElementById("delete-all-files");

deleteAllFillesButton.addEventListener('click', () => {
    fetch('/deleteAllFilesFromServer', { method: 'POST' })
        .then(res => res.json())
        .then(data => {

            if (!data.files || data.files.length === 0) {
                alert("No files available to delete.");
                return;
            }

            console.log(data.message);
            const fileList = document.getElementById("file-list");
            while (fileList.firstChild) {
                fileList.removeChild(fileList.firstChild);
            }
        })
        .catch(err => console.error("Error:", err));
});

const downloadAllFilesButton = document.getElementById("download-all-files");

downloadAllFilesButton.addEventListener('click', () => {
    fetch('/downloadAllFilesFromServer', { method: 'GET' })
        .then(res => res.json())
        .then(data => {
            if (data.files.length === 0) {
                alert("No files available for download.");
                return;
            }
            data.files.forEach(fileName => {
                const link = document.createElement('a');
                link.href = `/download/${fileName}`;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        })
        .catch(err => console.error("Error:", err));
});