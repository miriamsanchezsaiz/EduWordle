document.getElementById("uploadButton").addEventListener("click", function() {
    document.getElementById("fileInput").click();
});

document.getElementById("fileInput").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById("fileName").textContent = `Archivo seleccionado: ${file.name}`;
        document.getElementById("saveButton").disabled = false;
    }
});

document.getElementById("saveButton").addEventListener("click", async function() {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = async function(event) {
            const xmlContent = event.target.result;
            
            // Llamar a la función para procesar el archivo
            await processMoodleXMLAndInsert(xmlContent);
            
            alert("Archivo procesado y guardado en la base de datos.");
        };

        reader.readAsText(file);
    }
});
