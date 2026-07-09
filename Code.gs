/**
 * BeGlorious — Coach Sync (v2, lecture + écriture)
 *
 * INSTALLATION : identique à la v1 (voir GUIDE.md).
 * Ce script sert maintenant à la fois à ENREGISTRER (POST) et à
 * RELIRE (GET) les données, pour que l'app fonctionne pareil sur
 * n'importe quel appareil sans dépendre d'un compte Claude.
 */

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (data.type === "client") {
    var sheet = getOrCreateSheet_(ss, "Clients", [
      "ID", "Nom", "Date début", "Avatar / profil", "Objectifs actuels", "Notes générales", "Dernière MAJ", "Lien programmation", "Lien Sheet (extraction)"
    ]);
    upsertClientRow_(sheet, data);
  } else if (data.type === "session") {
    var sheet2 = getOrCreateSheet_(ss, "Séances", [
      "ID séance", "ID client", "Nom client", "Date", "Entraînement", "Score", "Remarques", "Blessure ?", "Horodatage", "Photo"
    ]);
    var photoUrl = "";
    if (data.photoBase64) {
      var editUrl = getClientProgrammationEditUrl_(ss, data.clientId);
      var placed = false;
      if (editUrl) {
        try {
          placed = insertPhotoIntoProgrammation_(editUrl, data.photoBase64, data.photoMimeType, data.date);
        } catch (err) {
          placed = false;
        }
      }
      photoUrl = placed
        ? "Intégrée dans la programmation"
        : savePhotoToDrive_(data.photoBase64, data.photoMimeType, data.clientNom, data.date, data.sessionId);
    }
    sheet2.appendRow([
      data.sessionId, data.clientId, data.clientNom, data.date, data.entrainement,
      data.score, data.remarques || "", data.blessureFlag ? "OUI" : "", new Date(), photoUrl
    ]);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var clientsSheet = ss.getSheetByName("Clients");
  var sessionsSheet = ss.getSheetByName("Séances");

  if (e.parameter && e.parameter.action === "extractProgrammation") {
    return handleExtractProgrammation_(e, clientsSheet);
  }

  var clients = [];
  if (clientsSheet) {
    var cv = clientsSheet.getDataRange().getValues();
    for (var i = 1; i < cv.length; i++) {
      if (!cv[i][0]) continue;
      clients.push({
        id: String(cv[i][0]),
        nom: cv[i][1],
        dateDebut: formatDate_(cv[i][2]),
        avatar: cv[i][3],
        objectifs: cv[i][4],
        notesGenerales: cv[i][5],
        programmationUrl: cv[i][7] || "",
        programmationEditUrl: cv[i][8] || ""
      });
    }
  }

  var sessions = [];
  if (sessionsSheet) {
    var sv = sessionsSheet.getDataRange().getValues();
    for (var j = 1; j < sv.length; j++) {
      if (!sv[j][0]) continue;
      sessions.push({
        sessionId: String(sv[j][0]),
        clientId: String(sv[j][1]),
        clientNom: sv[j][2],
        date: formatDate_(sv[j][3]),
        entrainement: sv[j][4],
        score: sv[j][5],
        remarques: sv[j][6],
        blessureFlag: sv[j][7] === "OUI",
        photoUrl: sv[j][9] || ""
      });
    }
  }

  var payload = JSON.stringify({ clients: clients, sessions: sessions });

  // Support JSONP (nécessaire pour lire depuis une page hébergée ailleurs
  // que script.google.com, sans quoi le navigateur bloque la lecture).
  if (e.parameter && e.parameter.callback) {
    return ContentService
      .createTextOutput(e.parameter.callback + "(" + payload + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
}

function handleExtractProgrammation_(e, clientsSheet) {
  var url = (e.parameter && e.parameter.sheetUrl) || "";
  var result;
  try {
    var id = extractSheetId_(url);
    if (!id || !isKnownProgrammationSheet_(clientsSheet, id)) {
      result = { error: "Lien non reconnu — vérifie qu'il correspond au « Lien Sheet (extraction) » enregistré pour ce client." };
    } else {
      result = { text: readSheetAsText_(id) };
    }
  } catch (err) {
    result = { error: "Lecture impossible : " + (err && err.message ? err.message : String(err)) };
  }

  var payload = JSON.stringify(result);
  if (e.parameter && e.parameter.callback) {
    return ContentService
      .createTextOutput(e.parameter.callback + "(" + payload + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
}

// Sécurité : n'ouvre que les Sheets déjà enregistrés comme "Lien Sheet
// (extraction)" sur une fiche client — empêche d'utiliser ce endpoint
// public comme proxy de lecture vers n'importe quel fichier du Drive du coach.
function isKnownProgrammationSheet_(clientsSheet, id) {
  if (!clientsSheet) return false;
  var values = clientsSheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var stored = extractSheetId_(String(values[i][8] || ""));
    if (stored && stored === id) return true;
  }
  return false;
}

function extractSheetId_(url) {
  var m = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(url || "");
  return m ? m[1] : null;
}

function readSheetAsText_(id) {
  var target = SpreadsheetApp.openById(id);
  var sheet = target.getSheets()[0];
  var values = sheet.getDataRange().getDisplayValues();
  var lines = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i].filter(function (c) { return String(c).trim() !== ""; });
    if (row.length) lines.push(row.join(" | "));
  }
  var text = lines.join("\n");
  return text.length > 6000 ? text.slice(0, 6000) + "\n… (tronqué)" : text;
}

function getClientProgrammationEditUrl_(ss, clientId) {
  var sheet = ss.getSheetByName("Clients");
  if (!sheet) return "";
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(clientId)) return String(values[i][8] || "");
  }
  return "";
}

// Best effort : place la photo dans la case "Tableau" du Sheet de
// programmation la plus proche de la date de séance. Ne modifie aucune
// valeur de cellule (image flottante ancrée) : en cas de mauvaise case,
// il suffit de la faire glisser à la main dans Google Sheets, rien n'est
// écrasé.
function insertPhotoIntoProgrammation_(editUrl, base64, mimeType, dateStr) {
  var id = extractSheetId_(editUrl);
  if (!id) return false;
  var target = SpreadsheetApp.openById(id);
  var sheet = pickProgrammationSheet_(target, dateStr);
  if (!sheet) return false;

  var targetDate = parseIsoDate_(dateStr);
  var values = sheet.getDataRange().getValues();
  var best = null; // { row, col, score } — score = écart en jours, Infinity si pas de date trouvée

  for (var r = 0; r < values.length; r++) {
    for (var c = 0; c < values[r].length; c++) {
      if (String(values[r][c] || "").trim().toLowerCase() !== "tableau") continue;
      var score = Infinity;
      for (var up = Math.max(0, r - 20); up < r; up++) {
        var d = toDate_(values[up][c]);
        if (d && targetDate) {
          var diff = Math.abs(d.getTime() - targetDate.getTime());
          if (diff < score) score = diff;
        }
      }
      if (!best || score < best.score || (score === Infinity && best.score === Infinity)) {
        best = { row: r, col: c, score: score };
      }
    }
  }
  if (!best) return false;

  var bytes = Utilities.base64Decode(base64);
  var blob = Utilities.newBlob(bytes, mimeType || "image/jpeg", "photo.jpg");
  sheet.insertImage(blob, best.col + 2, best.row + 1);
  return true;
}

function pickProgrammationSheet_(target, dateStr) {
  var d = parseIsoDate_(dateStr);
  if (d) {
    var months = ["JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE"];
    var candidate = months[d.getMonth()] + String(d.getFullYear()).slice(-2);
    var sheets = target.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      var name = sheets[i].getName().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (name.indexOf(candidate) > -1) return sheets[i];
    }
  }
  return target.getActiveSheet() || target.getSheets()[0];
}

function parseIsoDate_(isoStr) {
  if (!isoStr) return null;
  var parts = String(isoStr).split("-");
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function toDate_(v) {
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(v.trim());
    if (m) {
      var day = parseInt(m[1], 10), month = parseInt(m[2], 10) - 1, year = parseInt(m[3], 10);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }
  }
  return null;
}

function savePhotoToDrive_(base64, mimeType, clientNom, date, sessionId) {
  try {
    var folder = getOrCreatePhotosFolder_();
    var bytes = Utilities.base64Decode(base64);
    var type = mimeType || "image/jpeg";
    var ext = type.indexOf("png") > -1 ? "png" : "jpg";
    var name = (clientNom || "client") + "_" + (date || "") + "_" + sessionId + "." + ext;
    var blob = Utilities.newBlob(bytes, type, name);
    var file = folder.createFile(blob);
    return file.getUrl();
  } catch (err) {
    return "";
  }
}

function getOrCreatePhotosFolder_() {
  var name = "BeGlorious Coach Sync — Photos séances";
  var it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

function formatDate_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return v;
}

function getOrCreateSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function upsertClientRow_(sheet, data) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.id)) {
      sheet.getRange(i + 1, 1, 1, 9).setValues([[
        data.id, data.nom, data.dateDebut, data.avatar, data.objectifs, data.notesGenerales, new Date(), data.programmationUrl || "", data.programmationEditUrl || ""
      ]]);
      return;
    }
  }
  sheet.appendRow([
    data.id, data.nom, data.dateDebut, data.avatar, data.objectifs, data.notesGenerales, new Date(), data.programmationUrl || "", data.programmationEditUrl || ""
  ]);
}
