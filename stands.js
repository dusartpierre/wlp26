// Liste des exposants Whisky Live Paris 2026, transcrite depuis le plan officiel.
// Format : [numéro de stand, nom]. Corrigez librement : l'app se base sur ce fichier.
// ⚠️ Transcription depuis une image basse résolution : quelques numéros peuvent être approximatifs.

export const ZONES = [
  { id: 'calvados',  name: 'Calvados',            color: '#6fc3d3', stands: [[1,'Christian Drouin'],[2,'Roger Groult'],[13,'Domaine Éric Bordelet']] },
  { id: 'gin',       name: 'Gin',                 color: '#27a9b9', stands: [[3,'Citadelle Gin'],[4,'Gin Lane']] },
  { id: 'armagnac',  name: 'Armagnac',            color: '#3a73b8', stands: [[5,'Marquis de Montesquiou'],[6,"L'Encantada"],[7,'Dartigalongue'],[8,'Delord'],[9,'Maison Monluc / Atelier Jean Cavé'],[10,'Château de Lacquy'],[11,'Alabat'],[12,"Domaine d'Aurensan / Château de Léberon"]] },
  { id: 'cognac',    name: 'Cognac',              color: '#4a62a8', stands: [[14,'Tiffon / Braastad'],[15,'Delamain'],[16,'Maison Ferrand'],[17,'Bache-Gabrielsen'],[18,'Hine'],[19,'Vallein Tercinier'],[20,'François Voyer'],[21,'Merlet'],[22,'Larsen'],[23,'Tesseron'],[24,'Frapin'],[25,'Rémi Landier'],[26,'Grosperrin'],[28,'Parquet'],[106,'Maltemative Belgium']] },
  { id: 'edv',       name: 'Eaux-de-vie / Liqueurs / Porto / Vermouth', color: '#6d93b3', stands: [[27,'Ximénez-Spínola'],[28,'Distillerie Cazottes'],[29,'Kopke'],[30,'Biarritz Bonheur'],[31,'Cocchi'],[32,'Noces Royales'],[33,'Fair'],[34,'Nusbaumer']] },
  { id: 'france',    name: 'Whisky France',       color: '#2f6fb7', stands: [[34,'Brunn'],[35,'Maison Daucourt'],[36,'Ninkasi'],[37,'Domaine des Hautes Glaces'],[38,'Milhoc'],[39,'Bellevoye'],[40,'Twelve'],[41,'ABK6'],[42,'Distillerie des Menhirs'],[43,'P&M'],[44,'Moon Harbour'],[45,"Galaad / La Mine d'Or"],[46,'Armorik'],[47,'Fontagard'],[48,'Laferté'],[49,'Distillerie Hepp'],[50,'G. Rozelieures'],[51,'Pointe Blanche'],[52,'Évadé'],[53,'Arlett'],[54,'Maison Faw'],[55,'Distillerie Les Feux de Saint-Jean'],[56,'Cormeil'],[57,'Lagomorphe'],[58,'LAMAISON']] },
  { id: 'europe',    name: 'Europe (Roumanie, Angleterre, Galles, Finlande, Israël, Allemagne)', color: '#c43a78', stands: [[60,'Alexandrion Saber Distilleries 1789'],[61,'Cotswolds'],[62,'The Lakes Distillery'],[126,'Bankhall'],[63,"Penderyn / Serpent's Tears"],[126,'Aber Falls'],[64,'Kyrö'],[65,'M&H Distillery'],[66,'St. Kilian']] },
  { id: 'usa',       name: 'USA / Canada',        color: '#e0bf1c', stands: [[67,"Michter's"],[68,"Blanton's"],[69,'Willett'],[70,'Distillerie de Montréal / Rosemont'],[71,'WhistlePig'],[72,'BrDavis'],[73,'Elijah Craig / Rittenhouse / Widow Jane']] },
  { id: 'irlande',   name: 'Irlande',             color: '#e8753d', stands: [[74,'Redbreast'],[75,'Teeling'],[76,'Ballina Whiskey'],[77,'Drumshanbo'],[78,'Dingle'],[79,'West Cork']] },
  { id: 'asie',      name: 'Asie / Océanie',      color: '#9a5a9a', stands: [[80,'Mars Whisky'],[81,'Fuji'],[82,'Chichibu'],[83,'Laizhou'],[84,'Nikka Whisky'],[85,'Kavalan'],[86,'Ki One'],[87,'The Sool Company'],[88,'Prakaan'],[89,'Kanosuke'],[90,'House of Suntory'],[91,'Hatozaki'],[92,'Hellyers Road'],[104,'Amrut']] },
  { id: 'lmdw',      name: 'La Maison du Whisky', color: '#d6a318', stands: [['03.1','Dégustation des exclusivités Whisky Live Paris 2026'],['03.2','Catalogue Créations : Les Anthologistes']] },
  { id: 'sake',      name: 'Saké District',       color: '#e99bb3', stands: [[94,'La Maison du Saké'],[95,'Manumi / Miyasaka'],[96,'Horin'],[97,'Kura Master'],[98,'Hakutsuru'],[99,'Hakkaisan'],[100,'Fukumitsuya'],[101,'Kenbishi'],[102,'Daishichi'],[103,'Koshi No Kanbai'],[104,'Kizakura / Ejito'],[105,'Saburomaru'],[106,'Ume No Yado'],[107,'Inishie / Takumi'],[108,'Dassai']] },
  { id: 'ecosse',    name: 'Écosse',              color: '#3f7fb0', stands: [
      [109,'Compass Box','Blend'],
      [110,'Isle of Harris','Îles'],[111,'Scapa','Îles'],[112,'Torabhaig','Îles'],[113,'Arran / LAOO','Îles'],[114,'Jura','Îles'],
      [115,'Glenmorangie','Highlands'],[116,'Tullibardine','Highlands'],[117,'Arbikie Distillery','Highlands'],[118,'Old Pulteney','Highlands'],[119,'Balblair','Highlands'],[132,'Aberfeldy','Highlands'],
      [120,'Bruichladdich Distillery','Islay'],[121,'Ardnahoe','Islay'],[122,'Ardbeg','Islay'],[123,'Kilchoman','Islay'],[133,'Port Askaig / Elements of Islay','Islay'],[202,'The Islay Boys','Islay'],
      [124,'Bladnoch','Lowlands'],[125,'The Borders Distillery','Lowlands'],[126,'John Crabbie / Johnny Cree','Lowlands'],
      [127,'Glen Moray','Speyside'],[128,'Glendronach','Speyside'],[129,'Aberlour','Speyside'],[130,'Benromach','Speyside'],[131,'Glenfiddich / The Balvenie','Speyside'],[132,'Craigellachie','Speyside'],[134,'Tormore','Speyside'],[135,'Glenfarclas','Speyside'],[105,'Spey','Speyside'],[201,'The GlenAllachie','Speyside'],
      [130,'Gordon & MacPhail','Négociants'],[133,'The Single Malts of Scotland / WhiskiEY Trail','Négociants'],[136,'Douglas Laing','Négociants'],[137,'Berry Bros. & Rudd','Négociants'],[138,'Murray McDavid','Négociants'],[139,'Duncan Taylor','Négociants'],[140,'GourmetPool','Négociants'] ] },
  { id: 'tag',       name: 'Village TAG',         color: '#8a8f99', stands: [[141,'Selvatiq'],[142,'Strato'],[143,'Aventure'],[144,'La Conspiration'],[145,'Titanic Distillers'],[146,'Odyssée'],[147,'Distillerie du Mont Blanc'],[148,"SAB'S"],[149,'The Avant Gardists'],[150,'Ascend'],[151,'Faer Isles Distillery'],[152,'Third Eye'],[153,'La Plautre'],[154,'Lemon Story'],[155,'Portofino Dry Gin'],[156,'Winestillery']] },
  { id: 'partners',  name: 'Partenaires French Drinks Awards', color: '#9aa0a8', stands: [[197,'Vivelys'],[198,'Portulège & J.A. Beira'],[199,'Vista Alegre'],[200,'CIDS']] },
  { id: 'espaces',   name: 'Espaces & masterclasses', color: '#c9302c', stands: [['VIP','Espace VIP'],['MC1','Forum masterclasses – Salle 1'],['MC2','Forum masterclasses – Salle 2'],['ANT',"Forum masterclasses d'Anthologie"],['AUC','Bar Les Anthologistes / Fine Spirits Auction'],['CKT','Cocktail Street'],['VT','Village TAG (bar)'],['BTQ','Boutique La Maison du Whisky']] },
];

const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const STANDS = ZONES.flatMap(z => z.stands.map(([num, name, sub]) => ({
  id: `${slug(num)}-${slug(name)}`.slice(0, 60),
  num: String(num), name, zone: z.id, zoneName: z.name, sub: sub || '', color: z.color,
})));

export const STAND_BY_ID = Object.fromEntries(STANDS.map(s => [s.id, s]));
export const ZONE_BY_ID = Object.fromEntries(ZONES.map(z => [z.id, z]));
