import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Box, 
  Euro, 
  Maximize2, 
  Combine, 
  RotateCcw, 
  Lock, 
  Layers, 
  Eye,
  Trash2,
  Send,
  Check,
  Copy,
  X,
  Grid,
  ArrowDown,
  ShoppingBag,
  Smartphone,
  CheckCircle,
  MousePointerClick,
  Info
} from 'lucide-react';

const getDimensionColor = (colSpan, rowSpan) => {
  const key = `${colSpan}x${rowSpan}`;
  const colorMap = {
    '1x1': '#2563eb',
    '1x2': '#10b981',
    '2x1': '#f97316',
    '2x2': '#eab308',
    '1x3': '#ec4899',
    '3x1': '#06b6d4',
    '2x3': '#059669',
    '3x2': '#14b8a6',
    '3x3': '#6366f1',
    '4x1': '#84cc16',
    '1x4': '#d946ef',
    '4x2': '#dc2626',
    '2x4': '#9333ea',
    '4x4': '#0284c7'
  };
  return colorMap[key] || '#64748b';
};

const create3DrTextShapes = (scale = 1) => {
  const shapes = [];
  const sw = 3.2 * scale;

  // Letter "3"
  const s3 = new THREE.Shape();
  const ox3 = -14 * scale;
  const oy3 = -7 * scale;

  s3.moveTo(ox3, oy3 + 14 * scale);
  s3.lineTo(ox3 + 9 * scale, oy3 + 14 * scale);
  s3.lineTo(ox3 + 9 * scale, oy3 + 14 * scale - sw);
  s3.lineTo(ox3 + sw * 1.2, oy3 + 8 * scale);
  s3.lineTo(ox3 + 5 * scale, oy3 + 8 * scale);
  s3.quadraticCurveTo(ox3 + 9.5 * scale, oy3 + 8 * scale, ox3 + 9.5 * scale, oy3 + 3.5 * scale);
  s3.quadraticCurveTo(ox3 + 9.5 * scale, oy3 - 1 * scale, ox3 + 4.5 * scale, oy3 - 1 * scale);
  s3.lineTo(ox3, oy3 - 1 * scale);
  s3.lineTo(ox3, oy3 + sw - 1 * scale);
  s3.lineTo(ox3 + 4.5 * scale, oy3 + sw - 1 * scale);
  s3.quadraticCurveTo(ox3 + 6.3 * scale, oy3 + sw - 1 * scale, ox3 + 6.3 * scale, oy3 + 3.5 * scale);
  s3.quadraticCurveTo(ox3 + 6.3 * scale, oy3 + 8 * scale - sw, ox3 + 4 * scale, oy3 + 8 * scale - sw);
  s3.lineTo(ox3, oy3 + 8 * scale - sw);
  shapes.push(s3);

  // Letter "D"
  const sD = new THREE.Shape();
  const oxD = -2 * scale;
  const oyD = -8 * scale;

  sD.moveTo(oxD, oyD);
  sD.lineTo(oxD + 6.5 * scale, oyD);
  sD.quadraticCurveTo(oxD + 13.5 * scale, oyD, oxD + 13.5 * scale, oyD + 7.5 * scale);
  sD.quadraticCurveTo(oxD + 13.5 * scale, oyD + 15 * scale, oxD + 6.5 * scale, oyD + 15 * scale);
  sD.lineTo(oxD, oyD + 15 * scale);
  
  const holeD = new THREE.Path();
  holeD.moveTo(oxD + sw, oyD + sw);
  holeD.lineTo(oxD + 6 * scale, oyD + sw);
  holeD.quadraticCurveTo(oxD + 10.3 * scale, oyD + sw, oxD + 10.3 * scale, oyD + 7.5 * scale);
  holeD.quadraticCurveTo(oxD + 10.3 * scale, oyD + 15 * scale - sw, oxD + 6 * scale, oyD + 15 * scale - sw);
  holeD.lineTo(oxD + sw, oyD + 15 * scale - sw);
  sD.holes.push(holeD);
  shapes.push(sD);

  // Letter "r"
  const sr = new THREE.Shape();
  const oxr = 13.5 * scale;
  const oyr = -8 * scale;

  sr.moveTo(oxr, oyr);
  sr.lineTo(oxr + sw, oyr);
  sr.lineTo(oxr + sw, oyr + 4.5 * scale);
  sr.quadraticCurveTo(oxr + 2.5 * scale, oyr + 7.5 * scale, oxr + 6 * scale, oyr + 7.5 * scale);
  sr.lineTo(oxr + 6 * scale, oyr + 7.5 * scale - sw);
  sr.quadraticCurveTo(oxr + sw + 1 * scale, oyr + 7.5 * scale - sw, oxr + sw, oyr + 4.5 * scale);
  sr.lineTo(oxr + sw, oyr + 8.5 * scale);
  sr.lineTo(oxr, oyr + 8.5 * scale);
  shapes.push(sr);

  return shapes;
};

const generateBoxSTL = (box) => {
  const { width: w, depth: d, height: h, wallThickness: t, bottomThickness: b } = box;
  const radius = 8;
  const segments = 10;
  const logoDepth = 0.8;

  const generateRoundedPolygonPoints = (width, depth, rad = 8, segs = 10) => {
    const r = Math.min(rad, width / 2 - 0.1, depth / 2 - 0.1);
    const points = [];
    const addCornerArc = (cx, cy, startAngle, endAngle) => {
      for (let i = 0; i <= segs; i++) {
        const angle = startAngle + (endAngle - startAngle) * (i / segs);
        points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
      }
    };
    addCornerArc(width - r, r, -Math.PI / 2, 0);
    addCornerArc(width - r, depth - r, 0, Math.PI / 2);
    addCornerArc(r, depth - r, Math.PI / 2, Math.PI);
    addCornerArc(r, r, Math.PI, (3 * Math.PI) / 2);
    return points;
  };

  const outerPoly = generateRoundedPolygonPoints(w, d, radius, segments);
  const inW = Math.max(2, w - 2 * t);
  const inD = Math.max(2, d - 2 * t);
  const inRadius = Math.max(1, radius - t);
  const rawInnerPoly = generateRoundedPolygonPoints(inW, inD, inRadius, segments);
  const innerPoly = rawInnerPoly.map(([px, py]) => [px + t, py + t]);

  const N = outerPoly.length;
  let stl = `solid drawer_box_3dr_${w}x${d}x${h}\n`;

  const addFacet = (n, v1, v2, v3) => {
    stl += `facet normal ${n[0].toFixed(4)} ${n[1].toFixed(4)} ${n[2].toFixed(4)}\n`;
    stl += `  outer loop\n`;
    stl += `    vertex ${v1[0].toFixed(4)} ${v1[1].toFixed(4)} ${v1[2].toFixed(4)}\n`;
    stl += `    vertex ${v2[0].toFixed(4)} ${v2[1].toFixed(4)} ${v2[2].toFixed(4)}\n`;
    stl += `    vertex ${v3[0].toFixed(4)} ${v3[1].toFixed(4)} ${v3[2].toFixed(4)}\n`;
    stl += `  endloop\n`;
    stl += `endfacet\n`;
  };

  const addQuad = (v1, v2, v3, v4, normal) => {
    addFacet(normal, v1, v2, v3);
    addFacet(normal, v1, v3, v4);
  };

  const centerOuter = [w / 2, d / 2, 0];
  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    const p1 = [outerPoly[i][0], outerPoly[i][1], 0];
    const p2 = [outerPoly[next][0], outerPoly[next][1], 0];
    addFacet([0, 0, -1], centerOuter, p1, p2);
  }

  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    const p1 = [outerPoly[i][0], outerPoly[i][1], 0];
    const p2 = [outerPoly[next][0], outerPoly[next][1], 0];
    const p1h = [outerPoly[i][0], outerPoly[i][1], h];
    const p2h = [outerPoly[next][0], outerPoly[next][1], h];

    const dx = outerPoly[next][0] - outerPoly[i][0];
    const dy = outerPoly[next][1] - outerPoly[i][1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = dy / len;
    const ny = -dx / len;

    addQuad(p1, p2, p2h, p1h, [nx, ny, 0]);
  }

  const centerInner = [w / 2, d / 2, b];
  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    const p1 = [innerPoly[i][0], innerPoly[i][1], b];
    const p2 = [innerPoly[next][0], innerPoly[next][1], b];
    addFacet([0, 0, 1], centerInner, p2, p1);
  }

  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    const p1 = [innerPoly[i][0], innerPoly[i][1], b];
    const p2 = [innerPoly[next][0], innerPoly[next][1], b];
    const p1h = [innerPoly[i][0], innerPoly[i][1], h];
    const p2h = [innerPoly[next][0], innerPoly[next][1], h];

    const dx = innerPoly[next][0] - innerPoly[i][0];
    const dy = innerPoly[next][1] - innerPoly[i][1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    addQuad(p1, p1h, p2h, p2, [nx, ny, 0]);
  }

  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    const o1 = [outerPoly[i][0], outerPoly[i][1], h];
    const o2 = [outerPoly[next][0], outerPoly[next][1], h];
    const i1 = [innerPoly[i][0], innerPoly[i][1], h];
    const i2 = [innerPoly[next][0], innerPoly[next][1], h];

    addQuad(o1, o2, i2, i1, [0, 0, 1]);
  }

  const scale = Math.min(w, d) < 60 ? 0.6 : 1.0;
  const textShapes = create3DrTextShapes(scale);

  textShapes.forEach((shape) => {
    const points = shape.extractPoints(6);
    const shapeContour = points.shape;

    for (let i = 0; i < shapeContour.length; i++) {
      const next = (i + 1) % shapeContour.length;
      const x1 = w / 2 + shapeContour[i].x;
      const y1 = d / 2 + shapeContour[i].y;
      const x2 = w / 2 + shapeContour[next].x;
      const y2 = d / 2 + shapeContour[next].y;

      const v1 = [x1, y1, 0];
      const v2 = [x2, y2, 0];
      const v1z = [x1, y1, logoDepth];
      const v2z = [x2, y2, logoDepth];

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      addQuad(v1, v2, v2z, v1z, [nx, ny, 0]);
    }

    const centerLogo = [w / 2, d / 2, logoDepth];
    for (let i = 0; i < shapeContour.length; i++) {
      const next = (i + 1) % shapeContour.length;
      const p1 = [w / 2 + shapeContour[i].x, d / 2 + shapeContour[i].y, logoDepth];
      const p2 = [w / 2 + shapeContour[next].x, d / 2 + shapeContour[next].y, logoDepth];
      addFacet([0, 0, 1], centerLogo, p1, p2);
    }
  });

  stl += `endsolid drawer_box_3dr_${w}x${d}x${h}\n`;
  return stl;
};

const createRoundedBoxShape = (width, depth, radius = 8) => {
  const shape = new THREE.Shape();
  const r = Math.min(radius, width / 2 - 0.1, depth / 2 - 0.1);
  
  shape.moveTo(r, 0);
  shape.lineTo(width - r, 0);
  shape.quadraticCurveTo(width, 0, width, r);
  shape.lineTo(width, depth - r);
  shape.quadraticCurveTo(width, depth, width - r, depth);
  shape.lineTo(r, depth);
  shape.quadraticCurveTo(0, depth, 0, depth - r);
  shape.lineTo(0, r);
  shape.quadraticCurveTo(0, 0, r, 0);

  return shape;
};

export default function App() {
  const [drawerInputs, setDrawerInputs] = useState({
    width: '300',
    depth: '300',
    height: '60'
  });

  const [drawer, setDrawer] = useState({
    width: 300,
    depth: 300,
    height: 60
  });

  const [heightMarginInput, setHeightMarginInput] = useState('2');
  const [heightMargin, setHeightMargin] = useState(2);

  const [gridSize] = useState({ rows: 4, cols: 4 });

  const defaultLayout = [
    { id: '1', colStart: 0, rowStart: 0, colSpan: 2, rowSpan: 2 },
    { id: '2', colStart: 2, rowStart: 0, colSpan: 2, rowSpan: 2 },
    { id: '3', colStart: 0, rowStart: 2, colSpan: 2, rowSpan: 2 },
    { id: '4', colStart: 2, rowStart: 2, colSpan: 2, rowSpan: 2 }
  ];

  const [layout, setLayout] = useState(defaultLayout);
  const [boxes, setBoxes] = useState([]);
  const [selectedBoxId, setSelectedBoxId] = useState(null);
  const [activeColorPickerId, setActiveColorPickerId] = useState(null);
  const [customColors, setCustomColors] = useState({});

  const [mobileTab, setMobileTab] = useState('2d');

  const [boxSettings] = useState({
    wallThickness: 1.2,
    bottomThickness: 1.2,
    clearance: 0.5
  });

  const [pricingSettings] = useState({
    plaPricePerKg: 20,
    kwhPrice: 0.25,
    printerPowerW: 150,
    laborFeePerBox: 0.10,
    marginPercent: 300,
    shippingCostBE: 4.30
  });

  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    notes: ''
  });

  const standardColors = [
    { name: 'Bleu', hex: '#2563eb' },
    { name: 'Rouge', hex: '#dc2626' },
    { name: 'Jaune', hex: '#eab308' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Vert', hex: '#10b981' },
    { name: 'Blanc', hex: '#f8fafc' },
    { name: 'Noir', hex: '#0f172a' },
    { name: 'Gris', hex: '#64748b' }
  ];

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const gridContainerRef = useRef(null);

  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [orderSent, setOrderSent] = useState(false);

  const handleHeightMarginChange = (val) => {
    setHeightMarginInput(val);
    const num = parseFloat(val);
    setHeightMargin(!isNaN(num) && num >= 0 ? num : 0);
  };

  const calculateBoxCost = (box) => {
    const { width: w, depth: d, height: h, wallThickness: t, bottomThickness: b } = box;
    const outerVolume = (w * d * h) / 1000;
    const innerVolume = Math.max(0, ((w - 2 * t) * (d - 2 * t) * (h - b)) / 1000);
    const materialVolumeCm3 = Math.max(0, outerVolume - innerVolume);
    const weightGrams = materialVolumeCm3 * 1.24;
    const materialCost = (weightGrams / 1000) * pricingSettings.plaPricePerKg;
    const printTimeHours = materialVolumeCm3 / 18;
    const electricityCost = (pricingSettings.printerPowerW / 1000) * printTimeHours * pricingSettings.kwhPrice;
    const baseCost = materialCost + electricityCost + pricingSettings.laborFeePerBox;
    const finalPrice = baseCost * (1 + pricingSettings.marginPercent / 100);

    return {
      weightGrams: Math.round(weightGrams),
      printTimeHours: printTimeHours.toFixed(1),
      finalPrice: Math.max(0.80, finalPrice)
    };
  };

  const boxesSubtotal = boxes.reduce((acc, box) => {
    const cost = calculateBoxCost(box);
    return acc + cost.finalPrice;
  }, 0);

  const shippingCost = boxes.length > 0 ? pricingSettings.shippingCostBE : 0;
  const totalPrice = boxesSubtotal + shippingCost;

  const getOrderSummaryText = () => {
    let summary = `=== DEMANDE DE DEVIS / COMMANDE 3Dr ===\n\n`;
    summary += `--- COORDONNÉES CLIENT (BELGIQUE) ---\n`;
    if (clientInfo.name) summary += `Nom : ${clientInfo.name}\n`;
    if (clientInfo.email) summary += `Email : ${clientInfo.email}\n`;
    if (clientInfo.phone) summary += `Téléphone : ${clientInfo.phone}\n`;
    if (clientInfo.address) summary += `Adresse / Point Relay : ${clientInfo.address}\n`;
    if (clientInfo.postalCode || clientInfo.city) summary += `Ville / CP : ${clientInfo.postalCode} ${clientInfo.city} (Belgique)\n`;
    if (clientInfo.notes) summary += `Notes : ${clientInfo.notes}\n\n`;

    summary += `--- INFORMATIONS TECHNIQUES & TARIFS ESTIMÉS ---\n`;
    summary += `Dimensions Tiroir : ${drawer.width} x ${drawer.depth} x ${drawer.height} mm\n`;
    summary += `Jeu de hauteur : ${heightMargin} mm (Hauteur boîtes : ${Math.max(5, drawer.height - heightMargin)} mm)\n`;
    summary += `Gravure du texte "3Dr" : Enfoncement 0.8mm sous le fond\n`;
    summary += `Nombre de compartiments : ${boxes.length}\n`;
    summary += `Sous-total boîtes : ${boxesSubtotal.toFixed(2)} €\n`;
    summary += `Livraison Mondial Relay (Belgique uniquement) : ${shippingCost.toFixed(2)} €\n`;
    summary += `PRIX TOTAL ESTIMÉ : ${totalPrice.toFixed(2)} €\n\n`;
    summary += `--- DÉTAIL DES COMPARTIMENTS & STL SÉCURISÉS ---\n`;
    
    boxes.forEach((b, idx) => {
      summary += `\n[COMPARTIMENT #${idx + 1} : ${b.colSpan}x${b.rowSpan} - ${b.width}x${b.depth}x${b.height}mm - Couleur: ${b.color}]\n`;
      // Inclusion sécurisée du code STL textuel directement dans l'e-mail reçu par le vendeur
      summary += generateBoxSTL(b) + `\n----------------------------------------\n`;
    });

    return summary;
  };

  const copyOrderSummary = () => {
    navigator.clipboard.writeText(getOrderSummaryText());
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const sendEmailOrder = () => {
    const subject = encodeURIComponent(`Demande Devis 3Dr Belgique (Estimation ${totalPrice.toFixed(2)} €)`);
    const body = encodeURIComponent(getOrderSummaryText());
    window.open(`mailto:3dr.global@gmail.com?subject=${subject}&body=${body}`);
    setOrderSent(true);
  };

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const boxesGroupRef = useRef(null);
  const cameraRef = useRef(null);

  const handleDrawerInputChange = (field, value) => {
    setDrawerInputs(prev => ({ ...prev, [field]: value }));
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setDrawer(prev => ({ ...prev, [field]: num }));
    }
  };

  const resetLayoutToDefault = () => {
    setLayout(defaultLayout);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const clearLayout = () => {
    setLayout([]);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  useEffect(() => {
    const unitWidth = drawer.width / gridSize.cols;
    const unitDepth = drawer.depth / gridSize.rows;
    const clearance = boxSettings.clearance;
    const actualHeight = Math.max(5, drawer.height - heightMargin);

    const computedBoxes = layout.map((item) => {
      const rawWidth = item.colSpan * unitWidth;
      const rawDepth = item.rowSpan * unitDepth;

      const boxWidth = Math.max(10, Math.round((rawWidth - clearance) * 10) / 10);
      const boxDepth = Math.max(10, Math.round((rawDepth - clearance) * 10) / 10);
      const boxHeight = Math.max(10, Math.round(actualHeight * 10) / 10);

      const posX = item.colStart * unitWidth + clearance / 2;
      const posY = item.rowStart * unitDepth + clearance / 2;

      return {
        id: item.id,
        x: posX,
        y: posY,
        width: boxWidth,
        depth: boxDepth,
        height: boxHeight,
        colSpan: item.colSpan,
        rowSpan: item.rowSpan,
        wallThickness: boxSettings.wallThickness,
        bottomThickness: boxSettings.bottomThickness,
        color: customColors[item.id] || getDimensionColor(item.colSpan, item.rowSpan)
      };
    });

    setBoxes(computedBoxes);
  }, [drawer, heightMargin, layout, customColors]);

  const getCellFromCoords = (clientX, clientY) => {
    if (!gridContainerRef.current) return null;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return null;

    const col = Math.min(gridSize.cols - 1, Math.max(0, Math.floor((x / rect.width) * gridSize.cols)));
    const row = Math.min(gridSize.rows - 1, Math.max(0, Math.floor((y / rect.height) * gridSize.rows)));

    return { row, col };
  };

  const handlePointerStart = (r, c) => {
    if (selectionStart && !selectionEnd) {
      setSelectionEnd({ row: r, col: c });
      setIsSelecting(false);
    } else {
      setSelectionStart({ row: r, col: c });
      setSelectionEnd({ row: r, col: c });
      setIsSelecting(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isSelecting) return;
    const touch = e.touches[0];
    const cell = getCellFromCoords(touch.clientX, touch.clientY);
    if (cell) {
      setSelectionEnd(cell);
    }
  };

  const handleMouseOver = (r, c) => {
    if (isSelecting) {
      setSelectionEnd({ row: r, col: c });
    }
  };

  const handleMouseUp = () => {
    if (isSelecting) {
      setIsSelecting(false);
    }
  };

  const getSelectionBounds = () => {
    if (!selectionStart || !selectionEnd) return null;
    const minCol = Math.min(selectionStart.col, selectionEnd.col);
    const maxCol = Math.max(selectionStart.col, selectionEnd.col);
    const minRow = Math.min(selectionStart.row, selectionEnd.row);
    const maxRow = Math.max(selectionStart.row, selectionEnd.row);
    return {
      colStart: minCol,
      colSpan: maxCol - minCol + 1,
      rowStart: minRow,
      rowSpan: maxRow - minRow + 1
    };
  };

  const mergeSelectedArea = () => {
    const bounds = getSelectionBounds();
    if (!bounds) return;

    const filteredLayout = layout.filter(box => {
      const boxColEnd = box.colStart + box.colSpan - 1;
      const boxRowEnd = box.rowStart + box.rowSpan - 1;
      const selColEnd = bounds.colStart + bounds.colSpan - 1;
      const selRowEnd = bounds.rowStart + bounds.rowSpan - 1;

      return (
        boxColEnd < bounds.colStart ||
        box.colStart > selColEnd ||
        boxRowEnd < bounds.rowStart ||
        box.rowStart > selRowEnd
      );
    });

    const newBox = {
      id: Date.now().toString(),
      ...bounds
    };

    setLayout([...filteredLayout, newBox]);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 350;
    const height = mountRef.current.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f1f5f9');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 4000);
    camera.position.set(drawer.width * 1.3, drawer.height * 2.8, drawer.depth * 2.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(drawer.width / 2, drawer.height / 2, drawer.depth / 2);
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(300, 500, 300);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const boxesGroup = new THREE.Group();
    scene.add(boxesGroup);
    boxesGroupRef.current = boxesGroup;

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    };

    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 150);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (mountRef.current && rendererRef.current && cameraRef.current) {
      const timer = setTimeout(() => {
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        if (w > 0 && h > 0) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [mobileTab]);

  useEffect(() => {
    if (!sceneRef.current || !boxesGroupRef.current) return;

    const group = boxesGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const drawerGeo = new THREE.BoxGeometry(drawer.width, drawer.height, drawer.depth);
    const drawerMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.15
    });
    const drawerMesh = new THREE.Mesh(drawerGeo, drawerMat);
    drawerMesh.position.set(drawer.width / 2, drawer.height / 2, drawer.depth / 2);
    group.add(drawerMesh);

    const edges = new THREE.EdgesGeometry(drawerGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.position.copy(drawerMesh.position);
    group.add(wireframe);

    boxes.forEach((b) => {
      const isSelected = b.id === selectedBoxId;
      const wallT = b.wallThickness;
      const bottomT = b.bottomThickness;
      const cornerRadius = 8;

      const outerShape = createRoundedBoxShape(b.width, b.depth, cornerRadius);

      if (b.width > wallT * 2 && b.depth > wallT * 2) {
        const innerShapePath = new THREE.Path();
        const inW = b.width - wallT * 2;
        const inD = b.depth - wallT * 2;
        const inR = Math.max(1, cornerRadius - wallT);

        innerShapePath.moveTo(wallT + inR, wallT);
        innerShapePath.lineTo(wallT + inW - inR, wallT);
        innerShapePath.quadraticCurveTo(wallT + inW, wallT, wallT + inW, wallT + inR);
        innerShapePath.lineTo(wallT + inW, wallT + inD - inR);
        innerShapePath.quadraticCurveTo(wallT + inW, wallT + inD, wallT + inW - inR, wallT + inD);
        innerShapePath.lineTo(wallT + inR, wallT + inD);
        innerShapePath.quadraticCurveTo(wallT, wallT + inD, wallT, wallT + inD - inR);
        innerShapePath.lineTo(wallT, wallT + inR);
        innerShapePath.quadraticCurveTo(wallT, wallT, wallT + inR, wallT);

        outerShape.holes.push(innerShapePath);
      }

      const extrudeSettings = {
        depth: b.height - bottomT,
        bevelEnabled: false
      };
      const wallsGeo = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
      wallsGeo.rotateX(-Math.PI / 2);

      const bottomShape = createRoundedBoxShape(b.width, b.depth, cornerRadius);
      const bottomGeo = new THREE.ExtrudeGeometry(bottomShape, {
        depth: bottomT,
        bevelEnabled: false
      });
      bottomGeo.rotateX(-Math.PI / 2);

      const boxMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(b.color),
        roughness: 0.35,
        metalness: 0.1,
        side: THREE.DoubleSide
      });

      const boxGroup = new THREE.Group();

      const wallsMesh = new THREE.Mesh(wallsGeo, boxMat);
      wallsMesh.position.set(0, bottomT, b.depth);

      const bottomMesh = new THREE.Mesh(bottomGeo, boxMat);
      bottomMesh.position.set(0, 0, b.depth);

      boxGroup.add(wallsMesh);
      boxGroup.add(bottomMesh);

      const scale = Math.min(b.width, b.depth) < 60 ? 0.6 : 1.0;
      const textShapes = create3DrTextShapes(scale);
      const textMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(b.color).clone().multiplyScalar(0.75),
        roughness: 0.5,
        side: THREE.DoubleSide
      });

      textShapes.forEach(shape => {
        const textGeo = new THREE.ExtrudeGeometry(shape, {
          depth: 0.8,
          bevelEnabled: false
        });
        textGeo.rotateX(-Math.PI / 2);
        const textMesh = new THREE.Mesh(textGeo, textMat);
        textMesh.position.set(b.width / 2, 0, b.depth / 2);
        boxGroup.add(textMesh);
      });

      boxGroup.position.set(b.x, 0, b.y);

      if (isSelected) {
        const borderGeo = new THREE.BoxGeometry(b.width + 1, b.height + 1, b.depth + 1);
        const selEdges = new THREE.EdgesGeometry(borderGeo);
        const selLineMat = new THREE.LineBasicMaterial({ color: 0x6366f1, linewidth: 3 });
        const selWireframe = new THREE.LineSegments(selEdges, selLineMat);
        selWireframe.position.set(b.width / 2, b.height / 2, b.depth / 2);
        boxGroup.add(selWireframe);
      }

      group.add(boxGroup);
    });

    if (controlsRef.current) {
      controlsRef.current.target.set(drawer.width / 2, drawer.height / 2, drawer.depth / 2);
    }
  }, [drawer, boxes, selectedBoxId]);

  const selectionBounds = getSelectionBounds();

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 font-sans text-slate-800 overflow-hidden" onMouseUp={handleMouseUp}>
      {/* HEADER TOP BAR */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 flex items-center justify-between z-10 shadow-xs shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">Organisateur Tiroir 3Dr</h1>
            <p className="hidden sm:block text-xs text-slate-500">Sur-Mesure & Impression 3D</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => setShowShareModal(true)}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-200 cursor-pointer min-h-[38px]"
          >
            <Send className="w-4 h-4" />
            <span>Passer Commande</span>
          </button>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 sm:px-4 py-1 flex items-center gap-2 min-h-[38px]">
            <div className="p-1 bg-emerald-500 rounded-lg text-white">
              <Euro className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <span className="text-[8px] sm:text-[9px] font-bold text-emerald-600 uppercase tracking-wider block leading-tight">Estimation Total</span>
              <span className="text-xs sm:text-sm font-black text-emerald-700 leading-none">{totalPrice.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE TABS */}
      <div className="md:hidden bg-slate-200 p-1 flex justify-around border-b border-slate-300 text-xs font-bold shrink-0 z-20">
        <button
          onClick={() => setMobileTab('2d')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${mobileTab === '2d' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-600'}`}
        >
          <Grid className="w-4 h-4" /> Plan 2D
        </button>
        <button
          onClick={() => setMobileTab('3d')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${mobileTab === '3d' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-600'}`}
        >
          <Eye className="w-4 h-4" /> Vue 3D
        </button>
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${mobileTab === 'list' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-600'}`}
        >
          <Layers className="w-4 h-4" /> Boîtes ({boxes.length})
        </button>
      </div>

      {/* ORDER MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">Passer Commande</h3>
              </div>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" /> Coordonnées de Livraison (Belgique)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nom complet *"
                    value={clientInfo.name}
                    onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                  />
                  <input
                    type="email"
                    placeholder="Adresse Email *"
                    value={clientInfo.email}
                    onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="tel"
                    placeholder="Téléphone"
                    value={clientInfo.phone}
                    onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Code Postal (BE) *"
                    value={clientInfo.postalCode}
                    onChange={(e) => setClientInfo({ ...clientInfo, postalCode: e.target.value })}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Ville (Belgique) *"
                    value={clientInfo.city}
                    onChange={(e) => setClientInfo({ ...clientInfo, city: e.target.value })}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Adresse ou Point Mondial Relay souhaité en Belgique *"
                  value={clientInfo.address}
                  onChange={(e) => setClientInfo({ ...clientInfo, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                />

                {/* MODAL SHIPPING DETAILED BREAKDOWN */}
                <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1 mt-2">
                  <div className="flex justify-between items-center text-slate-700 font-semibold">
                    <span>Sous-total boîtes :</span>
                    <span>{boxesSubtotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 font-semibold">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> 
                      Livraison Mondial Relay (Uniquement Belgique) :
                    </span>
                    <span>{shippingCost.toFixed(2)} €</span>
                  </div>
                  <div className="border-t border-indigo-200 pt-1 flex justify-between items-center text-indigo-900 font-black text-sm">
                    <span>PRIX ESTIMÉ TOTAL :</span>
                    <span>{totalPrice.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={sendEmailOrder}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-md shadow-indigo-200 cursor-pointer min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
                  Envoyer la demande de devis
                </button>
                <button
                  onClick={copyOrderSummary}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition flex items-center justify-center gap-2 border border-slate-200 cursor-pointer min-h-[44px]"
                >
                  {copiedSummary ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedSummary ? 'Copié !' : 'Copier Récapitulatif'}
                </button>
              </div>

              {orderSent && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-center font-bold flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Commande initiée ! Merci.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* SIDEBAR & CONTROL PANEL */}
        <div className={`w-full md:w-80 bg-white border-r border-slate-200 flex flex-col overflow-y-auto shrink-0 ${mobileTab === '3d' ? 'hidden md:flex' : 'flex'}`}>
          {/* DRAWER DIMENSIONS */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
              Dimensions du Tiroir (mm)
            </h2>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Largeur</label>
                <input
                  type="number"
                  value={drawerInputs.width}
                  onChange={(e) => handleDrawerInputChange('width', e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Profondeur</label>
                <input
                  type="number"
                  value={drawerInputs.depth}
                  onChange={(e) => handleDrawerInputChange('depth', e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Hauteur</label>
                <input
                  type="number"
                  value={drawerInputs.height}
                  onChange={(e) => handleDrawerInputChange('height', e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1">
                    <ArrowDown className="w-3 h-3 text-indigo-600" /> Jeu de Hauteur (mm)
                  </label>
                  <p className="text-[9px] text-slate-400">
                    Hauteur utile : <strong className="text-slate-600">{Math.max(5, drawer.height - heightMargin)} mm</strong>
                  </p>
                </div>
                <div className="relative w-24">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={heightMarginInput}
                    onChange={(e) => handleHeightMarginChange(e.target.value)}
                    className="w-full px-2.5 py-2 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 text-right focus:outline-none focus:border-indigo-500 pr-7"
                  />
                  <span className="absolute right-2 top-2 text-[10px] font-bold text-indigo-400 pointer-events-none">mm</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Parois (mm)
                </label>
                <input
                  type="text"
                  disabled
                  value={boxSettings.wallThickness}
                  className="w-full px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-400 cursor-not-allowed select-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Fond (mm)
                </label>
                <input
                  type="text"
                  disabled
                  value={boxSettings.bottomThickness}
                  className="w-full px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-400 cursor-not-allowed select-none"
                />
              </div>
            </div>
          </div>

          {/* 2D INTERACTIVE GRID PLANNER */}
          <div className={`p-4 border-b border-slate-100 ${mobileTab === 'list' ? 'hidden md:block' : 'block'}`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Grid className="w-3.5 h-3.5 text-indigo-600" />
                Plan 2D (Grille 4x4)
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearLayout}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition flex items-center gap-1 text-[10px] font-medium"
                  title="Vider le tiroir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Vider
                </button>
                <button
                  onClick={resetLayoutToDefault}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition"
                  title="Réinitialiser"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mb-2 flex items-center gap-1">
              <MousePointerClick className="w-3 h-3 text-indigo-500" />
              <span>Faites glisser votre doigt ou tapez 2 cases pour fusionner.</span>
            </p>

            <div 
              ref={gridContainerRef}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => setIsSelecting(false)}
              className="relative w-full aspect-square border-2 border-slate-300 rounded-xl bg-slate-50 overflow-hidden shadow-inner select-none touch-none"
            >
              <div className="absolute inset-0 z-0">
                {layout.map((b) => {
                  const leftPercent = (b.colStart / gridSize.cols) * 100;
                  const topPercent = (b.rowStart / gridSize.rows) * 100;
                  const widthPercent = (b.colSpan / gridSize.cols) * 100;
                  const heightPercent = (b.rowSpan / gridSize.rows) * 100;
                  const color = customColors[b.id] || getDimensionColor(b.colSpan, b.rowSpan);

                  return (
                    <div
                      key={b.id}
                      className="absolute border-2 border-white/80 rounded-lg flex items-center justify-center transition-all shadow-xs"
                      style={{
                        left: `${leftPercent}%`,
                        top: `${topPercent}%`,
                        width: `${widthPercent}%`,
                        height: `${heightPercent}%`,
                        backgroundColor: color
                      }}
                    >
                      <span className="text-white text-[11px] font-extrabold shadow-sm bg-black/20 px-1.5 py-0.5 rounded">
                        {b.colSpan}×{b.rowSpan}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="absolute inset-0 z-10 pointer-events-none grid grid-cols-4 grid-rows-4">
                {Array.from({ length: 16 }).map((_, idx) => (
                  <div key={idx} className="border border-dashed border-slate-900/25" />
                ))}
              </div>

              {selectionBounds && (
                <div
                  className="absolute z-20 border-2 border-indigo-600 bg-indigo-500/30 rounded-lg pointer-events-none transition-all"
                  style={{
                    left: `${(selectionBounds.colStart / gridSize.cols) * 100}%`,
                    top: `${(selectionBounds.rowStart / gridSize.rows) * 100}%`,
                    width: `${(selectionBounds.colSpan / gridSize.cols) * 100}%`,
                    height: `${(selectionBounds.rowSpan / gridSize.rows) * 100}%`
                  }}
                />
              )}

              <div className="absolute inset-0 z-30 grid grid-cols-4 grid-rows-4 cursor-pointer">
                {Array.from({ length: gridSize.rows }).map((_, r) =>
                  Array.from({ length: gridSize.cols }).map((_, c) => (
                    <div
                      key={`${r}-${c}`}
                      onMouseDown={() => handlePointerStart(r, c)}
                      onTouchStart={() => handlePointerStart(r, c)}
                      onMouseOver={() => handleMouseOver(r, c)}
                      className="w-full h-full"
                    />
                  ))
                )}
              </div>
            </div>

            {selectionBounds && (
              <button
                onClick={mergeSelectedArea}
                className="mt-3 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-200 flex items-center justify-center gap-2 min-h-[42px] cursor-pointer"
              >
                <Combine className="w-4 h-4" />
                Fusionner la zone ({selectionBounds.colSpan}×{selectionBounds.rowSpan})
              </button>
            )}
          </div>

          {/* BOXES LIST & COLOR SELECTOR */}
          <div className={`p-4 flex-1 ${mobileTab === '2d' ? 'hidden md:block' : 'block'}`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Boîtes à Imprimer ({boxes.length})
              </h2>
            </div>

            {/* COLOR SELECTION HINT */}
            <p className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 p-2 rounded-lg mb-2 flex items-center gap-1.5 font-medium">
              <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Vous pouvez sélectionner la couleur en cliquant sur le rond de couleur.</span>
            </p>

            <div className="space-y-2">
              {boxes.map((box, idx) => {
                const isPickerOpen = activeColorPickerId === box.id;

                return (
                  <div key={box.id} className="relative">
                    <div 
                      onClick={() => setSelectedBoxId(box.id === selectedBoxId ? null : box.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        selectedBoxId === box.id 
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveColorPickerId(isPickerOpen ? null : box.id);
                            }}
                            className="w-7 h-7 rounded-full flex-shrink-0 border-2 border-white ring-2 ring-slate-200 hover:scale-110 transition-transform shadow-xs cursor-pointer"
                            style={{ backgroundColor: box.color }}
                            title="Changer la couleur"
                          />
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Compartiment #{idx + 1}</h4>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {box.width}×{box.depth}×{box.height} mm
                          </p>
                        </div>
                      </div>
                    </div>

                    {isPickerOpen && (
                      <div 
                        className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl p-2.5 shadow-xl grid grid-cols-4 gap-2 w-48"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {standardColors.map((c) => (
                          <button
                            key={c.name}
                            onClick={() => {
                              setCustomColors(prev => ({ ...prev, [box.id]: c.hex }));
                              setActiveColorPickerId(null);
                            }}
                            className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-100 transition group cursor-pointer"
                            title={c.name}
                          >
                            <span 
                              className="w-5 h-5 rounded-full border border-black/20 group-hover:scale-110 transition-transform shadow-xs" 
                              style={{ backgroundColor: c.hex }} 
                            />
                            <span className="text-[9px] text-slate-600 font-medium">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3D CANVAS VIEW AREA */}
        <div className={`flex-1 relative bg-slate-100 w-full h-full min-h-[350px] ${mobileTab === '3d' || window.innerWidth >= 768 ? 'flex' : 'hidden'}`}>
          <div ref={mountRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />
          
          <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur border border-slate-200 p-2.5 rounded-xl text-[10px] text-slate-600 shadow-sm flex items-center gap-2 pointer-events-none z-10">
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>Vue 3D (Glisser pour faire tourner)</span>
          </div>
        </div>
      </div>
    </div>
  );
}