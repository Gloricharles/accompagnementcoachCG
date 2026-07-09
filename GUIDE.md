# BeGlorious Coach Sync — mise en place (v2, multi-appareils)

Cette version ne dépend plus de Claude du tout : une fois hébergée, la même page
fonctionne à l'identique sur iPhone, iPad et MacBook, en lisant et écrivant en
direct dans un Google Sheet.

## 1. Le Google Sheet + script (backend)

1. Crée un nouveau Google Sheet.
2. `Extensions > Apps Script`.
3. Supprime le contenu par défaut et colle le contenu de `Code.gs`.
4. `Déployer > Nouveau déploiement` :
   - Type : **Application Web**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
5. Autorise les permissions demandées, puis copie l'URL qui se termine par `/exec`.

## 2. Configurer la page

Ouvre `index.html` dans un éditeur de texte. Tout en haut du
`<script>`, remplace :

```js
const SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_URL_HERE";
```

par l'URL copiée à l'étape 1. C'est la seule modification nécessaire, et elle
est faite une fois pour toutes dans le fichier — donc identique sur chaque
appareil qui ouvrira la page.

## 3. Héberger la page

Repo GitHub + GitHub Pages : `https://gloricharles.github.io/accompagnementcoachCG/`.

Ajoute cette URL en écran d'accueil sur ton iPhone et tes iPads (Safari →
Partager → Sur l'écran d'accueil) pour un accès en un tap, comme une vraie app.

## Comment ça marche au quotidien

- **Lecture** : à l'ouverture, la page va chercher les données à jour dans le
  Sheet (technique JSONP — nécessaire pour lire depuis un site hébergé ailleurs
  que Google). Un petit indicateur en haut à droite montre l'état : vert = à
  jour, jaune = synchro en cours, rouge = URL manquante ou échec de lecture.
- **Écriture** : chaque client ou séance enregistré part immédiatement vers le
  Sheet. L'app ne peut pas confirmer à 100% que Google a bien reçu chaque envoi
  (limite technique du navigateur), donc un rafraîchissement automatique se
  déclenche quelques secondes après chaque sauvegarde pour vérifier.
- **Cache local** : un instantané des dernières données est gardé dans le
  navigateur pour un affichage immédiat à l'ouverture, le temps que la lecture
  fraîche arrive. Ce cache est un confort d'affichage, jamais la source de
  vérité — le Sheet garde toujours le dernier mot.
- **Multi-appareils** : comme tous les appareils pointent vers la même URL et
  le même Sheet, une séance loggée sur l'iPad apparaît sur l'iPhone au
  prochain rafraîchissement (automatique à chaque retour sur l'onglet, ou
  manuel via le bouton dans Réglages).

## À tester avant utilisation réelle

1. Configure l'URL et héberge la page.
2. Ajoute un client test depuis un appareil.
3. Ouvre la page sur un deuxième appareil, rafraîchis → vérifie qu'il apparaît.
4. Vérifie aussi directement dans le Google Sheet que les onglets `Clients`
   et `Séances` se remplissent bien.

## Onglet Programmation (v3)

Chaque client peut avoir son propre Google Sheet de programmation (celui où
tu construis ses séances). Coach Sync peut l'afficher directement dans
l'onglet **Programmation**, sans changer d'onglet de navigateur.

**Important** : Google n'autorise l'affichage d'un Sheet dans une page tierce
que s'il est publié. Le Sheet reste éditable normalement comme aujourd'hui,
mais devient consultable par toute personne disposant du lien (non listé,
non indexé, mais plus tout à fait privé). À faire une fois par client dont tu
veux voir la programmation dans l'app :

1. Ouvre le Sheet de programmation du client (ex. celui de Greg).
2. `Fichier → Partager → Publier sur le Web`.
3. Choisis « Document entier », clique **Publier**, confirme.
4. Copie le lien affiché (il ressemble à
   `https://docs.google.com/spreadsheets/d/e/2PACX-.../pubhtml`).
5. Dans Coach Sync, onglet **Clients** → ouvre la fiche du client → colle ce
   lien dans **Lien programmation** → **Enregistrer le client**.

Si tu mets à jour la mise en page du Sheet plus tard, rien à refaire : le
lien reste valable, seul le contenu affiché change.

### Mise à jour du Sheet existant (si tu avais déjà des clients avant cette version)

La colonne `Lien programmation` a été ajoutée à la fin de l'onglet `Clients`
(colonne H). Si ton onglet `Clients` existait déjà avant cette mise à jour,
ajoute manuellement l'en-tête `Lien programmation` en H1 — sinon les
prochaines sauvegardes de clients l'ajouteront automatiquement à la bonne
colonne, seul l'en-tête manque pour que ce soit lisible.

N'oublie pas de recoller le contenu mis à jour de `Code.gs` dans l'éditeur
Apps Script et de créer une **nouvelle version** du déploiement
(`Déployer → Gérer les déploiements → ✏️ → Nouvelle version → Déployer`) —
l'URL `/exec` ne change pas, mais le code ne se met à jour qu'après ça.

## Extraction du texte de programmation (v4)

En plus de l'affichage visuel, tu peux extraire le texte brut d'un Sheet de
programmation pour le réutiliser directement dans le Logger — sans retaper
la séance à la main.

Contrairement à l'affichage (qui a besoin d'un Sheet publié publiquement),
l'extraction lit le Sheet **directement avec tes propres droits d'accès**
(le script tourne « en tant que toi ») : le Sheet peut donc rester privé
pour cette partie-là.

**Mise en place, une fois par client :**

1. Coach Sync → onglet **Clients** → fiche du client → colle le **lien normal
   d'édition** du Sheet (celui que tu utilises tous les jours, du type
   `https://docs.google.com/spreadsheets/d/XXXX/edit?usp=sharing`) dans
   **Lien Sheet (extraction)** → **Enregistrer le client**.
2. Onglet **Programmation** → sélectionne le client → bouton **Extraire le
   texte** → le contenu du Sheet apparaît dans une zone modifiable.
3. Ajuste/coupe le texte pour ne garder que la séance du jour, puis
   **Envoyer vers Logger** → ça bascule sur l'onglet Logger avec le client
   sélectionné et le texte prérempli dans « Entraînement du jour ».
4. Termine de compléter le score/remarques et **Enregistrer la séance**
   comme d'habitude — ça part sur l'onglet `Séances` du Sheet Coach Sync.

**Sécurité** : ce lien d'extraction est volontairement séparé du lien de
publication. Il n'est jamais affiché dans une iframe ni rendu public. Le
script vérifie en plus que le Sheet demandé correspond bien à un lien déjà
enregistré sur une fiche client, pour empêcher que quelqu'un d'autre utilise
ce point d'entrée pour lire un autre fichier de ton Drive.

### Mise à jour du Sheet existant (v4)

La colonne `Lien Sheet (extraction)` a été ajoutée en colonne I de l'onglet
`Clients`. Comme pour la v3, ajoute manuellement l'en-tête si l'onglet
existait déjà, recolle `Code.gs` dans Apps Script, et publie une **nouvelle
version** du déploiement.

## Photo de séance (v5)

Le Logger a un champ **Photo** optionnel (tableau blanc, carnet...). Elle est
prise directement avec l'appareil photo du téléphone, redimensionnée dans le
navigateur (pour rester légère), puis envoyée avec la séance. Le script la
dépose dans un dossier Drive dédié — **BeGlorious Coach Sync — Photos
séances** — créé automatiquement au premier envoi, et enregistre le lien
dans une nouvelle colonne `Photo` de l'onglet `Séances`. Ce dossier reste
privé (accessible uniquement depuis ton propre compte Google), aucune
publication n'est nécessaire pour cette fonctionnalité. Le lien apparaît
ensuite en 📷 à côté de la séance concernée dans l'onglet **Avant séance**.

**Important** : cette version demande une nouvelle autorisation (accès à
Drive, en plus de Sheets). Au premier envoi d'une photo (ou au redéploiement
du script), Google va probablement redemander une confirmation d'accès —
c'est normal, accepte comme la première fois.

Recolle `Code.gs` dans Apps Script et publie une **nouvelle version** du
déploiement comme pour les mises à jour précédentes.
