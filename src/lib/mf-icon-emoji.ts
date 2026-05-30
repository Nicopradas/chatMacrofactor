/**
 * Mapa de los iconos de MacroFactor a un emoji parecido (MacroFactor usa
 * ilustraciones propias, no emojis; esto es la aproximación más cercana).
 * Lo usamos junto a cada alimento en el carrito y en el chat.
 */
const MAP: Record<string, string> = {
  // Bebidas
  water: "💧", coffee: "☕", coffeeCappuccino: "☕", coffeeEspresso: "☕",
  coffeeIceWhip: "🥤", creamer: "🥛", juiceApple: "🧃", juiceLemonade: "🍋",
  juiceOrange: "🧃", juiceTomato: "🍅", juiceWatermelon: "🍉", kefir: "🥛",
  milk: "🥛", milkshakeTwoFlavors: "🥤", milkSoy: "🥛", milkRice: "🥛",
  milkshake: "🥤", soda: "🥤", tea: "🍵", teaFruitLemon: "🍋", teaFruitOrange: "🍊",
  alcoholBeer: "🍺", alcoholCocktail: "🍸", alcoholLiqueur: "🥃",
  alcoholMassProducedFruity: "🍹", alcoholSpirit: "🥃", alcoholWhiskey: "🥃",
  alcoholWineRed: "🍷", alcoholWineWhite: "🥂",
  // Genéricos
  foodDefault: "🍽️", plateQuickAdd: "🍽️",
  // Frutos secos / semillas
  acorn: "🌰", almond: "🌰", cashews: "🌰", chestnut: "🌰", macadamiaNut: "🌰",
  nut: "🌰", nutBrazil: "🌰", nutsMixed: "🥜", pecan: "🌰", pineNut: "🌰",
  pistachio: "🌰", walnut: "🌰", peanut: "🥜", peanutButter: "🥜",
  sunflowerSeeds: "🌻", pumpkinSeed: "🎃",
  // Frutas
  apple: "🍎", appleRed: "🍎", appleSauceBowl: "🍎", appleSauceJar: "🍎",
  bananas: "🍌", blueberries: "🫐", blueberry: "🫐", cantaloupe: "🍈",
  cherries: "🍒", cranberries: "🫐", date: "🌴", fig: "🍑", grapefruit: "🍊",
  grapesGreen: "🍇", grapesRed: "🍇", guava: "🍐", kiwi: "🥝", lemon: "🍋",
  lime: "🍋", lychee: "🍒", mango: "🥭", melonHoneydew: "🍈", orange: "🍊",
  peach: "🍑", pear: "🍐", pearAsian: "🍐", pearBosc: "🍐", persimmon: "🍅",
  pineapple: "🍍", plum: "🍑", pomegranate: "🍎", prune: "🍇", raisins: "🍇",
  raspberry: "🍓", rhubarb: "🥬", starfruit: "⭐", strawberry: "🍓",
  watermelon: "🍉", coconut: "🥥", fruitSalad: "🥗",
  // Verduras
  artichoke: "🥬", asparagus: "🥬", avocado: "🥑", bellPepperGreen: "🫑",
  bellPepperRed: "🫑", bellPepperYellow: "🫑", bokChoyXiaoBaiCai: "🥬",
  broccoli: "🥦", burdockRoot: "🥕", cabbage: "🥬", cabbageHead: "🥬",
  carrot: "🥕", cauliflower: "🥦", celery: "🥬", chard: "🥬",
  chiliPeppersGreen: "🌶️", chiliPeppersRed: "🌶️", chiliPeppersRedYellow: "🌶️",
  corn: "🌽", cucumber: "🥒", daikon: "🥕", eggplant: "🍆", garlic: "🧄",
  garlicRoasted: "🧄", ginger: "🫚", greenBeans: "🫛", greenBeansFive: "🫛",
  greenOnion: "🧅", lettuce: "🥬", lettuceHead: "🥬", mushroom: "🍄",
  onion: "🧅", onionRed: "🧅", parsley: "🌿", dill: "🌿", radishes: "🥕",
  shallot: "🧅", snowPeas: "🫛", sproutedMungBean: "🌱", squashAcorn: "🎃",
  squashAcornAlt: "🎃", turnip: "🥬", vegetables: "🥗", watercress: "🥬",
  zucchini: "🥒", pumpkin: "🎃", potato: "🥔", potatoesPurple: "🥔",
  potatoesRedSweet: "🍠", potatoesWhiteRusset: "🥔", potatoRed: "🥔",
  beansPan: "🫘", lentils: "🫘", oliveBlack: "🫒", oliveGreen: "🫒",
  guacamole: "🥑", hummus: "🫓", saladBowl: "🥗", saladEggsTomatoes: "🥗",
  saladPlate: "🥗", seaweedSalad: "🥗", tomato: "🍅",
  // Carnes / pescados / huevos
  bacon: "🥓", beefTarTar: "🥩", chicken: "🍗", chickenGrilled: "🍗",
  chickenNuggetsBBQSauce: "🍗", chickenWings: "🍗", deer: "🦌", duck: "🦆",
  egg: "🥚", eggDeviled: "🥚", eggs: "🥚", fish: "🐟", jerkyBeef: "🥩",
  meatballs: "🍝", meatLoaf: "🍖", meatLoafPan: "🍖", porkLoin: "🥩",
  porkLoinWithDarkRub: "🥩", ribs: "🍖", salami: "🍖", salmonFilet: "🐟",
  sashimiTuna: "🍣", sausage: "🌭", spam: "🥫", steakBoneIn: "🥩",
  steakPlate: "🥩", steakRaw: "🥩", turkey: "🦃", turkeyRoast: "🦃",
  crab: "🦀", lobster: "🦞", octopus: "🐙", oyster: "🦪", scallops: "🦪",
  shrimp: "🦐", squid: "🦑", sloppyJoe: "🍔",
  // Lácteos
  butter: "🧈", butterPlate: "🧈", butterPlatePale: "🧈", cheeseSlice: "🧀",
  cheeseString: "🧀", cheeseWheel: "🧀", cottageCheese: "🧀", sourCream: "🥛",
  yogurt: "🥛", babyMilk: "🍼",
  // Pan / cereales / pasta
  bagel: "🥯", breadBaguette: "🥖", breadLoafMultigrain: "🍞",
  breadLoafWheat: "🍞", breadMultigrainTwoSlices: "🍞", breadPita: "🫓",
  breadRyeTwoSlicesWithSpread: "🍞", breadWheatTwoSlices: "🍞",
  butterCrustPastriesSmall: "🥐", butterCrustPastryLarge: "🥐", calzone: "🥟",
  cinnamon: "🥖", cinnamonRoll: "🥐", croissant: "🥐", croutons: "🍞",
  dinnerRolls: "🍞", kaiserRoll: "🥖", toast: "🍞", pretzel: "🥨",
  pretzelSticks: "🥨", tostadaLahmacun: "🫓", wheat: "🌾", wheatFlat: "🌾",
  oatmeal: "🥣", overnightOats: "🥣", milkCerealBlueBowl: "🥣",
  milkCerealYellowBowl: "🥣", congee: "🍚", riceBrownBowl: "🍚",
  riceCake: "🍙", riceWhiteBowl: "🍚", lasagne: "🍝", macAndCheese: "🧀",
  ravioli: "🥟", spaghettiRedSauce: "🍝", baoziXiaoLongBao: "🥟",
  // Platos preparados
  biryani: "🍛", bowlChopSticks: "🍜", casserole: "🍲", chirashiBowlSushi: "🍣",
  falafel: "🧆", gravy: "🍛", mealPlateFullEnglishBreakfast: "🍳",
  mealPlateSteakPotatoesVeggies: "🍽️", mealWaterGlassRice: "🍚",
  omelette: "🍳", omeletteWithMeat: "🍳", oshirukoZenzaiAdzukiRedBean: "🍲",
  pancake: "🥞", pancakesStack: "🥞", potPie: "🥧", soup: "🍲", soupBowl: "🍲",
  soupBowlCongee: "🍚", soupGreen: "🍲", soupPea: "🍲", soupRamenPork: "🍜",
  soupRamenRed: "🍜", soupRedTomato: "🍅", stewPot: "🍲", sushi: "🍣",
  waffles: "🧇", wokStirFry: "🍜", eggTartDanTa: "🥧",
  // Hamburguesas / fast food / snacks
  burgerCheesePattyLettuceTomato: "🍔", burgerSesameSeedRoundBun: "🍔",
  burgerSesameSeedRoundBunLettuceKetchup: "🍔",
  burgerSquareBreadBunLettuceKetchup: "🍔",
  doubleCheeseBurgerSesameSeedRoundBun: "🍔",
  burritoEnchiladaRollBrown: "🌯", burritoEnchiladaRollGreen: "🌯",
  burritoEnchiladaRollOrange: "🌯", burritoSoftTacoChilis: "🌮",
  chipsBaked: "🍟", chipsBakedSeasoned: "🍟", chipsPotato: "🍟",
  frenchFries: "🍟", hotDogInBunMustard: "🌭", hotDogs: "🌭", popcorn: "🍿",
  pizzaPepperoni: "🍕", pizzaPepperoniMushroom: "🍕", bagSnackJunkFood: "🍿",
  crackersDigestives: "🍪",
  // Dulces / postres
  biscotti: "🍪", biscuit: "🍪", cakeSliceCheesecake: "🍰",
  cakeSliceChocolateCherry: "🍰", cakeSquareChocolate: "🍫", cakeSquares: "🍰",
  candy: "🍬", candyBar: "🍫", candyToffee: "🍬", chocolateBars: "🍫",
  chocolateChips: "🍫", chocolateHotDrinkWhipCream: "☕", chocolateKiss: "🍫",
  cocoa: "☕", cupcakeChocolate: "🧁", dairyIceCream: "🍨", doughnut: "🍩",
  figNewtons: "🍪", gummyBears: "🐻", honey: "🍯", iceCreamDrumstickChocolate: "🍦",
  iceCreamDrumstickStrawberry: "🍦", iceCreamSandwich: "🍨",
  iceCreamSugarCone: "🍦", iceCreamSundae: "🍨", jamApricot: "🍑",
  jamMarmalade: "🍊", jamRed: "🍓", jello: "🍮", jelloCake: "🍮",
  mapleSyrup: "🍁", marshmallow: "🍡", mintGum: "🍬", muffin: "🧁",
  muffinNuts: "🧁", oreos: "🍪", pie: "🥧", pieLatticeCrust: "🥧",
  popTarts: "🧇", softServeChocolateSwirls: "🍦", sugarBrownCubes: "🍬",
  sugarWhite: "🍬", sugarWhiteCubes: "🍬",
  // Condimentos / otros
  cannedGoods: "🥫", drySpicesBrown: "🧂", drySpicesGreen: "🧂",
  drySpicesOlive: "🧂", drySpicesRed: "🧂", drySpicesYellow: "🧂",
  spicesGround: "🧂", jar: "🫙", jarOrangeLarge: "🍊", ketchup: "🍅",
  mayo: "🥚", mayoSqueezeBottle: "🥚", mustard: "🌭", oil: "🫗",
  salsa: "🍅", sauceBBQWorcestershire: "🍶", bakingPan: "🍳",
};

export function mfIconEmoji(icon: string | undefined): string {
  if (icon && MAP[icon]) return MAP[icon];
  return "🍽️";
}
