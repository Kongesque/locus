const dropArea = document.getElementById("drop-area");
const uploadForm = document.getElementById('uploadForm'); // flask
const uploadFile = document.getElementById('fileInput'); // flask
const dummyBtn = document.getElementById('dummy'); // flask

dropArea.addEventListener("click", function () { uploadFile.click(); });
uploadFile.addEventListener('change', function () {
    dummyBtn.click();
    uploadForm.submit();
});


dropArea.addEventListener("dragover", function (e) {
    e.preventDefault();
});

dropArea.addEventListener("drop", function (e) {
    e.preventDefault();
    uploadFile.files = e.dataTransfer.files;
    uploadForm.submit();
});

