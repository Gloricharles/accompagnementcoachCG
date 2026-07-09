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
      "ID", "Nom", "Date début", "Avatar / profil", "Objectifs actuels", "Notes générales", "Dernière MAJ", "Lien programmation"
    ]);
    upsertClientRow_(sheet, data);
  } else if (data.type === "session") {
    var sheet2 = getOrCreateSheet_(ss, "Séances", [
      "ID séance", "ID client", "Nom client", "Date", "Entraînement", "Score", "Remarques", "Blessure ?", "Horodatage"
    ]);
    sheet2.appendRow([
      data.sessionId, data.clientId, data.clientNom, data.date, data.entrainement,
      data.score, data.remarques || "", data.blessureFlag ? "OUI" : "", new Date()
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
        programmationUrl: cv[i][7] || ""
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
        blessureFlag: sv[j][7] === "OUI"
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
      sheet.getRange(i + 1, 1, 1, 8).setValues([[
        data.id, data.nom, data.dateDebut, data.avatar, data.objectifs, data.notesGenerales, new Date(), data.programmationUrl || ""
      ]]);
      return;
    }
  }
  sheet.appendRow([
    data.id, data.nom, data.dateDebut, data.avatar, data.objectifs, data.notesGenerales, new Date(), data.programmationUrl || ""
  ]);
}
