const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

const toast = document.getElementById("toast");
const toast_content = document.getElementById("content");
const API_URL = "https://api.ecoledirecte.com/v3";
const API_VER = "4.53.1";
const COMMON_HEADERS = {
    //'authority': 'api.ecoledirecte.com',
    'accept': 'application/json, text/plain, */*',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'content-type': 'application/x-www-form-urlencoded',
    'sec-gpc': '1',
    'origin': 'https://www.ecoledirecte.com',
    'sec-fetch-site': 'same-site',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    'referer': 'https://www.ecoledirecte.com/',
    'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
}


async function login(username, password) {
    try {
        let payload = `data={"identifiant":"${username}","motdepasse":"${password}"}`
        let response = await fetch(`${API_URL}/login.awp`, {
            method: 'POST',
            headers: COMMON_HEADERS,
            body: encodeURIComponent(payload)
        })
        // get json data
        let data = await response.json()
        console.log(data)
        return data
    } catch (error) {
        console.error(error)
    }
}

async function get_notes(id, token) {
    COMMON_HEADERS['X-Token'] = token
    let payload = 'data={"anneeScolaire": ""}'
    try {
        let response = await fetch(`${API_URL}/eleves/${id}/notes.awp?verbe=get&v=${API_VER}`, {
            method: 'POST',
            headers: COMMON_HEADERS,
            body: encodeURIComponent(payload)
        })
        // get json data
        let data = await response.json()
        console.log(data)
        return data
    } catch (error) {
        console.error(error)
    }

}


function show_toast(title, message) {
    $.toast({
        text: message,
        heading: title,
        showHideTransition: 'plain',
        allowToastClose: true,
        hideAfter: 3000,
        stack: 4,
        position: 'bottom-right',
        bgColor: '#101213',
        textColor: '#eeeeee',
        textAlign: 'left',
        loader: true,
        loaderBg: '#9EC600',
    });
}

function loading() {
    $(".grid").addClass("hide");
    $(".loader").removeClass("hide");

}

function progress() {
    $(".loader").addClass("hide");
    $(".note").removeClass("hide");

}

function unloading() {
    $(".loader").addClass("hide");
    $(".grid").removeClass("hide");
    $(".note").addClass("hide");
}

function clear_input() {
    document.getElementById("login__username").value = "";
    document.getElementById("login__password").value = "";
}

function reset() {
    clear_input();
    unloading();
    COMMON_HEADERS['X-Token'] = "";
}

async function button_click() {
    let username = document.getElementById("login__username").value
    let password = document.getElementById("login__password").value
    show_toast("Connexion", `Essai de connexion avec l'identifiant ${username}...`)
    loading()


    let data = await login(username, password)
    if (data.code !== 200 || data.message !== "") {
        show_toast("Erreur", "Identifiant ou mot de passe incorrect.")
        reset();
        return;
    }

    show_toast("Connexion réussie", `Connecté sur le compte de ${data.data.accounts[0].prenom} ${data.data.accounts[0].nom}. Récupération des notes...`)
    let token = data.token
    let id = data.data.accounts[0].id

    let notes_data = await get_notes(id, token)
    if (notes_data.code !== 200) {
        show_toast("Erreur", "Erreur lors de la récupération des notes.")
        reset();
        return;
    }

    let notes = notes_data.data.notes
    let periodes = {};

    notes.forEach(note => {
        let periode = note['codePeriode'];
        if (!periodes[periode]) {
            periodes[periode] = [];
        }
        periodes[periode].push(note);
    });
    console.log(periodes);

    let new_periodes = {};

    Object.keys(periodes).forEach(periode => {
        let notes = periodes[periode];
        let matieres = {};
        if (!new_periodes[periode]) {
            new_periodes[periode] = {};
        }
        notes.forEach(note => {
            let matiere = note['libelleMatiere'];
            if (!matieres[matiere]) {
                matieres[matiere] = [];
            }
            matieres[matiere].push(note);
        });
        for (let matiere in matieres) {
            let notes = matieres[matiere];
            totalNoteValue = 0;
            totalCoef = 0;
            notes.forEach(note => {
                note['valeur'] = note['valeur'].replace(",", ".");
                if (parseFloat(note['noteSur']) !== 20) {
                    note['valeur'] = (parseFloat(note['valeur']) * 20) / parseFloat(note['noteSur']);
                }
                totalNoteValue += parseFloat(note['valeur']) * parseFloat(note["coef"]);
                totalCoef += parseFloat(note['coef']);
            });
            if (totalCoef === 0) {
                continue;
            }
            let noteGeneral = Math.round((totalNoteValue / totalCoef) * 100) / 100;
            new_periodes[periode][matiere] = noteGeneral;
        }
    });
    console.log(new_periodes);
    let div = document.getElementById("note");
    Object.keys(new_periodes).forEach(periode => {
        let matieres = periodes[periode];
        let note_g = 0;
        $(".note").append(`<div class="periode ${periode}"><h1>${periode}</h1></div>`);
        let container = $(`.${periode}`)
        Object.keys(new_periodes[periode]).forEach(matiere => {
            container.append(`<div><h2>${matiere}: ${new_periodes[periode][matiere]}</h2></div>`);
        });
        for (let matiere in new_periodes[periode]) {
            note_g += new_periodes[periode][matiere];
        }
        note_g = Math.round((note_g / Object.keys(new_periodes[periode]).length) * 100) / 100;
        container.append(`<div><h2>note générale: ${note_g}</h2></div>`);
    });
    progress();
};