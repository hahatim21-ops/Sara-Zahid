// Per-page measurements (source-pixel coordinates of each reference image).
// rect = [x0, y0, x1, y1]. Everything listed here is lifted off the reference so it can be re-drawn live.

export const FONTS = {
  script: { file: 'node_modules/@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff', css: "'Great Vibes'" },
  serif400: { file: 'node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-400-normal.woff', css: "'EB Garamond'", weight: 400 },
  serif500: { file: 'node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-500-normal.woff', css: "'EB Garamond'", weight: 500 },
  serif600: { file: 'node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-600-normal.woff', css: "'EB Garamond'", weight: 600 },
  italic400: { file: 'node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-400-italic.woff', css: "'EB Garamond'", weight: 400, style: 'italic' },
};

export const PAGES = {
  1: {
    src: 'page1-keyhole.jpg',
    elements: { keyhole: { rect: [568, 1052, 882, 1462], mode: 'object', thr: 20 } },
    erase: [],
    lines: [],
    // glow anchors: top = the sprite pivot (cap of the lantern), so glow and crystal swing as one
    chandeliers: [
      { x: 135, y: 960, w: 200, h: 300, top: 745 },
      { x: 1300, y: 960, w: 200, h: 300, top: 745 },
    ],
    sprites: [
      { name: 'chandelier-left', rect: [25, 735, 248, 1122], pivot: [135, 745] },
      { name: 'chandelier-right', rect: [1192, 735, 1408, 1122], pivot: [1300, 745] },
      { name: 'palm-left', rect: [0, 1118, 272, 1412], pivot: [0, 1300] },
      { name: 'palm-right', rect: [1178, 1118, 1449, 1412], pivot: [1449, 1300] },
    ],
  },
  2: {
    src: 'page2-monogram.png',
    elements: { monogram: { rect: [335, 622, 615, 924], mode: 'ink', close: 3 } },
    erase: [
      { id: 'div', rect: [300, 1038, 640, 1084] },
    ],
    lines: [
      { id: 'sara', rect: [280, 940, 442, 1036], text: 'Sara', font: 'script', write: true },
      { id: 'bar', rect: [455, 940, 485, 1036], shape: true },
      { id: 'zahid', rect: [487, 944, 675, 1036], text: 'Zahid', font: 'script', write: true },
    ],
    chandeliers: [
      { x: 155, y: 870, w: 120, h: 130, top: 812 },
      { x: 786, y: 870, w: 120, h: 130, top: 812 },
    ],
    sprites: [
      { name: 'chandelier-left', rect: [90, 802, 222, 948], pivot: [155, 812] },
      { name: 'chandelier-right', rect: [720, 802, 852, 948], pivot: [786, 812] },
      { name: 'palm-left', rect: [0, 538, 268, 792], pivot: [67, 715] },
      { name: 'palm-right', rect: [673, 538, 941, 792], pivot: [874, 715] },
    ],
    candles: {
      manual: [
        [301, 1449], [270, 1474], [235, 1495], [198, 1498], [198, 1535], [160, 1516], [160, 1565], [119, 1544], [119, 1602], [77, 1574], [77, 1626],
        [642, 1450], [673, 1474], [708, 1495], [745, 1499], [745, 1534], [782, 1516], [786, 1565], [824, 1544], [824, 1601], [864, 1575], [867, 1626],
      ],
    },
  },
  3: {
    src: 'page3-invitation.jpg',
    elements: {
      monogram: { rect: [598, 652, 862, 926], mode: 'ink', close: 3 },
      bismillah: { rect: [540, 920, 910, 998], mode: 'ink', close: 1 },
      flourish: { rect: [560, 1942, 890, 2042], mode: 'ink', close: 1 },
    },
    erase: [
      { id: 'div1', rect: [560, 1098, 880, 1136] },
      { id: 'withL', rect: [526, 1645, 646, 1668] },
      { id: 'withR', rect: [800, 1645, 920, 1668] },
    ],
    lines: [
      { id: 'l1', rect: [560, 1003, 890, 1046], text: 'In the name of Allah,', font: 'serif400', group: 'body' },
      { id: 'l2', rect: [460, 1046, 990, 1088], text: 'The Most Gracious, The Most Merciful.', font: 'serif400', group: 'body' },
      { id: 'gp1', rect: [400, 1146, 1052, 1206], text: 'Mr. Abdul Rehman Abdal Razak &', font: 'script', group: 'gp' },
      { id: 'gp2', rect: [470, 1206, 1000, 1275], text: 'Mrs. Rehana Abdul Majeed', font: 'script', group: 'gp' },
      { id: 'r1', rect: [370, 1278, 1080, 1324], text: 'request the honour of your presence & blessings at', font: 'serif400', group: 'body' },
      { id: 'r2', rect: [340, 1324, 1110, 1370], text: 'the Nikah & Reception Ceremony of their granddaughter', font: 'serif400', group: 'body' },
      { id: 'sara', rect: [560, 1372, 902, 1515], text: 'Sara', font: 'script', write: true },
      { id: 'd1', rect: [410, 1515, 1030, 1561], text: 'D/o Mr. Mohamed Ibrahim (Sohail) &', font: 'serif500', group: 'parents' },
      { id: 'd2', rect: [460, 1561, 990, 1605], text: 'Mrs. Samina Mohamed Ibrahim', font: 'serif500', group: 'parents' },
      { id: 'with', rect: [670, 1632, 772, 1678], text: 'With', font: 'serif400' },
      { id: 'zahid', rect: [520, 1690, 940, 1830], text: 'Zahid', font: 'script', write: true, band: [1678, 1834] },
      { id: 's1', rect: [425, 1835, 1025, 1888], text: 'S/o Mr. Ashfaque Ishaque Moulvi &', font: 'serif500', group: 'parents' },
      { id: 's2', rect: [460, 1888, 990, 1939], text: 'Mrs. Farzana Ashfaque Moulvi', font: 'serif500', group: 'parents' },
      { id: 'credit', rect: [283, 2411, 667, 2459], text: '@BESPOKEDESIGNS._', font: 'serif600', ls: 0.02, credit: true },
    ],
    chandeliers: [
      { x: 232, y: 1252, w: 160, h: 290, top: 1105 },
      { x: 1217, y: 1256, w: 160, h: 290, top: 1105 },
    ],
    sprites: [
      { name: 'chandelier-left', rect: [140, 1100, 326, 1416], pivot: [232, 1105] },
      { name: 'chandelier-right', rect: [1124, 1100, 1310, 1416], pivot: [1217, 1105] },
      { name: 'palm-left', rect: [0, 858, 420, 1104], pivot: [125, 1117] },
      { name: 'palm-right', rect: [1029, 858, 1449, 1104], pivot: [1324, 1117] },
    ],
    candles: { detect: { yMinFrac: 0.76, minR: 240, minG: 200, maxB: 192, minGB: 40, maxRG: 60, minWhite: 3, white: [250, 243, 225], exclude: [[0, 0.76, 0.2, 0.85], [0.8, 0.76, 1, 0.85]] } },
  },
  4: {
    src: 'page4-events.png',
    elements: {},
    erase: [
      { id: 'nDiv', rect: [250, 332, 640, 365] },
      { id: 'nBanner', rect: [212, 370, 675, 458], all: true },
      { id: 'nAtL', rect: [292, 640, 382, 662] },
      { id: 'nAtR', rect: [502, 640, 594, 662] },
      { id: 'rDiv', rect: [258, 1146, 628, 1182] },
      { id: 'rAtL', rect: [298, 1390, 380, 1410] },
      { id: 'rAtR', rect: [508, 1390, 590, 1410] },
    ],
    lines: [
      { id: 'nTitle', rect: [234, 222, 660, 291], text: 'Nikah Ceremony', font: 'serif500' },
      { id: 'nInsha', rect: [290, 294, 600, 323], text: 'IN - SHA - ALLAH', font: 'serif500', ls: 0.2, group: 'insha' },
      { id: 'nDate', rect: [165, 465, 720, 535], segs: [['30'], ['th', 0.5, 0.42], [' November 2026']], font: 'serif500', group: 'date' },
      { id: 'nDay', rect: [290, 535, 600, 579], text: 'Monday, 12.00 pm', font: 'serif400', group: 'sub' },
      { id: 'nHijri', rect: [230, 584, 660, 623], text: '(19 Jumada Al-Thani 1448 Hijri)', font: 'serif400', group: 'hijri' },
      { id: 'nAt', rect: [386, 630, 498, 670], text: '~ At ~', font: 'italic400', group: 'at' },
      { id: 'nVenue', rect: [280, 680, 610, 741], text: 'Minara Masjid', font: 'serif500' },
      { id: 'nAddr1', rect: [285, 741, 605, 771], text: '22, Mohamed Ali Road,', font: 'serif400', group: 'addr' },
      { id: 'nAddr2', rect: [320, 772, 575, 806], text: 'Mumbai - 400003', font: 'serif400', group: 'addr' },
      { id: 'rTitle', rect: [284, 1036, 608, 1112], text: 'Reception', font: 'serif500' },
      { id: 'rInsha', rect: [296, 1114, 592, 1143], text: 'IN - SHA - ALLAH', font: 'serif500', ls: 0.2, group: 'insha' },
      { id: 'rDay', rect: [365, 1184, 525, 1222], text: 'Monday,', font: 'serif400', group: 'sub' },
      { id: 'rDate', rect: [220, 1225, 670, 1280], segs: [['30'], ['th', 0.5, 0.42], [' November 2026,']], font: 'serif500', group: 'rdate' },
      { id: 'rTime', rect: [290, 1280, 600, 1323], text: '8.00 pm onwards', font: 'serif400', group: 'sub' },
      { id: 'rHijri', rect: [228, 1330, 660, 1371], text: '(19 Jumada Al-Thani 1448 Hijri)', font: 'serif400', group: 'hijri' },
      { id: 'rAt', rect: [384, 1380, 504, 1419], text: '~ At ~', font: 'italic400', group: 'at' },
      { id: 'rVenue', rect: [175, 1428, 712, 1481], text: 'Cutchi Memon Jamat Khana', font: 'serif500' },
      { id: 'rAddr1', rect: [285, 1483, 602, 1521], text: '131, Kambekar Street,', font: 'serif400', group: 'addr' },
      { id: 'rAddr2', rect: [312, 1521, 572, 1555], text: 'Mumbai - 400003', font: 'serif400', group: 'addr' },
    ],
    chandeliers: [],
    candles: {
      detect: {
        yMinFrac: 0, minR: 240, minG: 165, maxB: 175, minGB: 50, maxRG: 80, minWhite: 6,
        exclude: [[0, 0.13, 1, 0.89], [0.2, 0.06, 0.8, 0.13], [0, 0.89, 0.12, 1], [0.88, 0.89, 1, 1], [0.36, 0.89, 0.64, 1],
          [0, 0, 0.09, 0.04], [0.9, 0, 1, 0.04], [0.1, 0.88, 0.26, 0.905], [0.76, 0.88, 0.86, 0.905]],
      },
    },
  },
  5: {
    src: 'page5-regards.jpg',
    elements: {},
    erase: [
      { id: 'regL', rect: [414, 1276, 600, 1300], dy: -70 },
      { id: 'regR', rect: [868, 1276, 1046, 1300], dy: -70 },
    ],
    lines: [
      { id: 'regards', rect: [614, 1238, 862, 1334], text: 'Regards', font: 'serif500', dy: -70 },
      { id: 'family', rect: [360, 1338, 1110, 1532], text: 'Vataoo Family', font: 'script', write: true, dy: -70 },
      { id: 'credit', rect: [495, 2245, 900, 2295], text: '@BESPOKEDESIGNS._', font: 'serif600', ls: 0.02, credit: true },
    ],
    chandeliers: [
      { x: 165, y: 938, w: 190, h: 300, top: 750 },
      { x: 1290, y: 942, w: 190, h: 300, top: 755 },
    ],
    sprites: [
      { name: 'chandelier-left', rect: [55, 740, 276, 1092], pivot: [165, 750] },
      { name: 'chandelier-right', rect: [1178, 745, 1400, 1096], pivot: [1290, 755] },
      { name: 'palm-left', rect: [0, 1096, 292, 1292], pivot: [0, 1120] },
      { name: 'palm-right', rect: [1158, 1098, 1449, 1294], pivot: [1449, 1120] },
    ],
  },
};
