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
