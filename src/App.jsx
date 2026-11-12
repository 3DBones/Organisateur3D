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
  Info,
  Loader2,
  Sliders,
  MessageSquare,
  Globe,
  Plus,
  Sparkles,
  ArrowRight,
  Scaling,
  AlertTriangle
} from 'lucide-react';

const standardColors = [
  { name: 'Bleu', hex: '#2563eb', disabled: true },
  { name: 'Rouge', hex: '#dc2626', disabled: false },
  { name: 'Gold', hex: '#FFD700', disabled: false },
  { name: 'Orange', hex: '#f97316', disabled: false },
  { name: 'Vert', hex: '#10b981', disabled: true },
  { name: 'Blanc', hex: '#e2e8f0', disabled: false },
  { name: 'Noir', hex: '#0f172a', disabled: true },
  { name: 'Gris', hex: '#64748b', disabled: true }
];

const getDimensionColor = (colSpan, rowSpan, index = 0) => {
  const key = `${colSpan}x${rowSpan}`;
  const colorMap = {
    '1x1': '#2563eb',
    '1x2': '#10b981',
    '2x1': '#f97316',
    '2x2': '#FFD700',
    '1x3': '#dc2626',
    '3x1': '#e2e8f0',
    '2x3': '#10b981',
    '3x2': '#dc2626',
    '3x3': '#f97316',
    '4x1': '#FFD700',
    '1x4': '#dc2626',
    '4x2': '#f97316',
    '2x4': '#2563eb',
    '4x4': '#FFD700',
    '6x6': '#FFD700'
  };
  if (colorMap[key]) return colorMap[key];
  const palette = ['#FFD700', '#f97316', '#dc2626', '#e2e8f0', '#2563eb', '#10b981'];
  return palette[index % palette.length];
};

// Calcul des largeurs/profondeurs réelles de chaque colonne/ligne à partir des poids
const computeGridTracks = (totalSize, weights) => {
  const safeWeights = weights && weights.length === 6 ? weights : [1, 1, 1, 1, 1, 1];
  const totalWeight = safeWeights.reduce((sum, w) => sum + w, 0) || 6;
  const sizes = safeWeights.map(w => (w / totalWeight) * totalSize);
  const offsets = [];
  let acc = 0;
  for (let i = 0; i < sizes.length; i++) {
    offsets.push(acc);
    acc += sizes[i];
  }
  return { sizes, offsets };
};

// Calcul des dimensions exactes d'un compartiment sur la grille pondérée
const computeBoxMetrics = (item, drawerDims, clearance, heightMargin, colWeights, rowWeights) => {
  const { sizes: colSizes, offsets: colOffsets } = computeGridTracks(drawerDims.width, colWeights);
  const { sizes: rowSizes, offsets: rowOffsets } = computeGridTracks(drawerDims.depth, rowWeights);
  const actualHeight = Math.max(5, drawerDims.height - heightMargin);

  let rawWidth = 0;
  for (let c = item.colStart; c < item.colStart + item.colSpan; c++) {
    rawWidth += colSizes[c] || 0;
  }

  let rawDepth = 0;
  for (let r = item.rowStart; r < item.rowStart + item.rowSpan; r++) {
    rawDepth += rowSizes[r] || 0;
  }

  const boxWidth = Math.max(10, Math.round((rawWidth - clearance) * 10) / 10);
  const boxDepth = Math.max(10, Math.round((rawDepth - clearance) * 10) / 10);
  const boxHeight = Math.max(10, Math.round(actualHeight * 10) / 10);

  const posX = (colOffsets[item.colStart] || 0) + clearance / 2;
  const posY = (rowOffsets[item.rowStart] || 0) + clearance / 2;

  return {
    x: posX,
    y: posY,
    width: boxWidth,
    depth: boxDepth,
    height: boxHeight,
    rawWidth,
    rawDepth
  };
};

const generateBoxSTL = (box) => {
  const { width: w, depth: d, height: h, wallThickness: t, bottomThickness: b } = box;
  const radius = 8;
  const segments = 10;

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
    addFacet([0, 0, -1], centerOuter, p2, p1);
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
    addFacet([0, 0, 1], centerInner, p1, p2);
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
  const MAX_COMPARTMENT_SIZE = 250;
  const MIN_TRACK_SIZE = 15;
  const DEFAULT_WEIGHTS = [1, 1, 1, 1, 1, 1];

  const defaultLayout = [
    { id: '1', colStart: 0, rowStart: 0, colSpan: 3, rowSpan: 6 },
    { id: '2', colStart: 3, rowStart: 0, colSpan: 3, rowSpan: 3 },
    { id: '3', colStart: 3, rowStart: 3, colSpan: 3, rowSpan: 3 }
  ];

  const [drawersList, setDrawersList] = useState([
    {
      id: 'drawer-1',
      name: 'Tiroir 1',
      dimensions: { width: 300, depth: 200, height: 40 },
      dimensionInputs: { width: '300', depth: '200', height: '40' },
      heightMargin: 2,
      heightMarginInput: '2',
      clearance: 1,
      clearanceInput: '1',
      colWeights: [...DEFAULT_WEIGHTS],
      rowWeights: [...DEFAULT_WEIGHTS],
      layout: defaultLayout,
      customColors: {}
    }
  ]);
  const [activeDrawerId, setActiveDrawerId] = useState('drawer-1');

  const activeDrawer = drawersList.find(d => d.id === activeDrawerId) || drawersList[0];

  const drawerInputs = activeDrawer.dimensionInputs;
  const drawer = activeDrawer.dimensions;
  const heightMarginInput = activeDrawer.heightMarginInput;
  const heightMargin = activeDrawer.heightMargin;
  const clearanceInput = activeDrawer.clearanceInput;
  const clearance = activeDrawer.clearance;
  const colWeights = activeDrawer.colWeights || DEFAULT_WEIGHTS;
  const rowWeights = activeDrawer.rowWeights || DEFAULT_WEIGHTS;
  const layout = activeDrawer.layout;
  const customColors = activeDrawer.customColors;

  const notesInputRef = useRef(null);

  const [gridSize] = useState({ rows: 6, cols: 6 });
  const [boxes, setBoxes] = useState([]);
  const [selectedBoxId, setSelectedBoxId] = useState(null);
  const [activeColorPickerId, setActiveColorPickerId] = useState(null);

  // États locaux pour l'édition fluide des cotes exactes (width/depth en mm) par compartiment
  const [boxDimInputs, setBoxDimInputs] = useState({});
  const [dimWarning, setDimWarning] = useState(null);

  const updateActiveDrawer = (updater) => {
    setDrawersList(prev => prev.map(d => d.id === activeDrawerId ? updater(d) : d));
  };

  const setDrawerInputs = (valOrFn) => {
    updateActiveDrawer(d => {
      const nextInputs = typeof valOrFn === 'function' ? valOrFn(d.dimensionInputs) : valOrFn;
      return { ...d, dimensionInputs: nextInputs };
    });
  };

  const setDrawer = (valOrFn) => {
    updateActiveDrawer(d => {
      const nextDims = typeof valOrFn === 'function' ? valOrFn(d.dimensions) : valOrFn;
      return { ...d, dimensions: nextDims };
    });
  };

  const setHeightMarginInput = (val) => {
    updateActiveDrawer(d => ({ ...d, heightMarginInput: val }));
  };

  const setHeightMargin = (val) => {
    updateActiveDrawer(d => ({ ...d, heightMargin: val }));
  };

  const setClearanceInput = (val) => {
    updateActiveDrawer(d => ({ ...d, clearanceInput: val }));
  };

  const setClearance = (val) => {
    updateActiveDrawer(d => ({ ...d, clearance: val }));
  };

  const setLayout = (valOrFn) => {
    updateActiveDrawer(d => {
      const nextLayout = typeof valOrFn === 'function' ? valOrFn(d.layout) : valOrFn;
      return { ...d, layout: nextLayout };
    });
  };

  const setCustomColors = (valOrFn) => {
    updateActiveDrawer(d => {
      const nextColors = typeof valOrFn === 'function' ? valOrFn(d.customColors) : valOrFn;
      return { ...d, customColors: nextColors };
    });
  };

  const resetWeights = () => {
    updateActiveDrawer(d => ({
      ...d,
      colWeights: [...DEFAULT_WEIGHTS],
      rowWeights: [...DEFAULT_WEIGHTS]
    }));
    setDimWarning(null);
  };

  const addNewDrawer = () => {
    const newId = `drawer-${Date.now()}`;
    const newDrawerNum = drawersList.length + 1;
    const refDrawer = drawersList[0].dimensions;

    const newDrawerItem = {
      id: newId,
      name: `Tiroir ${newDrawerNum}`,
      dimensions: { width: refDrawer.width, depth: refDrawer.depth, height: refDrawer.height },
      dimensionInputs: { width: String(refDrawer.width), depth: String(refDrawer.depth), height: String(refDrawer.height) },
      heightMargin: drawersList[0].heightMargin,
      heightMarginInput: drawersList[0].heightMarginInput,
      clearance: drawersList[0].clearance,
      clearanceInput: drawersList[0].clearanceInput,
      colWeights: [...DEFAULT_WEIGHTS],
      rowWeights: [...DEFAULT_WEIGHTS],
      layout: [
        { id: '1', colStart: 0, rowStart: 0, colSpan: 3, rowSpan: 3 },
        { id: '2', colStart: 3, rowStart: 0, colSpan: 3, rowSpan: 3 }
      ],
      customColors: {}
    };
    setDrawersList(prev => [...prev, newDrawerItem]);
    setActiveDrawerId(newId);
  };

  const removeDrawer = (id, e) => {
    e.stopPropagation();
    if (drawersList.length <= 1) {
      setDimWarning("Vous devez conserver au moins un tiroir.");
      return;
    }
    const filtered = drawersList.filter(d => d.id !== id);
    setDrawersList(filtered);
    if (activeDrawerId === id) {
      setActiveDrawerId(filtered[0].id);
    }
  };

  // Recalcul des poids des colonnes ou des lignes lorsqu'une cote exacte est saisie
  const applyExactBoxDimension = (boxId, axis, targetMm) => {
    const boxItem = layout.find(b => b.id === boxId);
    if (!boxItem) return;

    const isWidth = axis === 'width';
    const totalDrawerSize = isWidth ? drawer.width : drawer.depth;
    const startIdx = isWidth ? boxItem.colStart : boxItem.rowStart;
    const span = isWidth ? boxItem.colSpan : boxItem.rowSpan;
    const totalTracks = isWidth ? gridSize.cols : gridSize.rows;
    const currentWeights = isWidth ? [...colWeights] : [...rowWeights];

    // Si la boîte occupe toute la largeur/profondeur du tiroir, on ne peut pas changer sa dimension indépendamment du tiroir
    if (span >= totalTracks) {
      setDimWarning(
        `Ce compartiment occupe toute la ${isWidth ? 'longueur' : 'largeur'} du tiroir (${Math.round((totalDrawerSize - clearance) * 10) / 10} mm). Modifiez l'étape 1 ou divisez-le en plusieurs cases.`
      );
      return;
    }

    const remainingTracks = totalTracks - span;
    // Espace brut nécessaire sur la grille = cote boîte demandée + jeu entre boîtes
    const minAllowedBox = MIN_TRACK_SIZE;
    const maxPossibleRaw = totalDrawerSize - remainingTracks * MIN_TRACK_SIZE;
    const maxAllowedBox = Math.min(MAX_COMPARTMENT_SIZE, Math.round((maxPossibleRaw - clearance) * 10) / 10);

    if (maxAllowedBox < minAllowedBox) {
      setDimWarning(`Le tiroir (${totalDrawerSize} mm) est trop petit pour redimensionner ce compartiment.`);
      return;
    }

    let clampedTarget = targetMm;
    if (targetMm > MAX_COMPARTMENT_SIZE) {
      setDimWarning(
        `Limite d'impression : ${MAX_COMPARTMENT_SIZE} mm max. Cote ajustée à ${maxAllowedBox} mm (ajoutez une note pour un assemblage sur-mesure).`
      );
      clampedTarget = maxAllowedBox;
    } else if (targetMm > maxAllowedBox) {
      setDimWarning(
        `Cote max possible dans ce tiroir : ${maxAllowedBox} mm (pour conserver au moins ${MIN_TRACK_SIZE} mm sur les autres colonnes/lignes).`
      );
      clampedTarget = maxAllowedBox;
    } else if (targetMm < minAllowedBox) {
      setDimWarning(`La dimension minimale d'un compartiment est de ${minAllowedBox} mm.`);
      clampedTarget = minAllowedBox;
    } else {
      setDimWarning(null);
    }

    const desiredRawSpanSize = clampedTarget + clearance;
    const remainingRawSize = totalDrawerSize - desiredRawSpanSize;

    // Poids proportionnels aux poids actuels à l'intérieur et à l'extérieur de la boîte
    let insideWeightSum = 0;
    let outsideWeightSum = 0;
    for (let i = 0; i < totalTracks; i++) {
      if (i >= startIdx && i < startIdx + span) {
        insideWeightSum += currentWeights[i];
      } else {
        outsideWeightSum += currentWeights[i];
      }
    }

    const newWeights = currentWeights.map((w, i) => {
      if (i >= startIdx && i < startIdx + span) {
        const ratio = insideWeightSum > 0 ? w / insideWeightSum : 1 / span;
        return Math.max(0.01, desiredRawSpanSize * ratio);
      } else {
        const ratio = outsideWeightSum > 0 ? w / outsideWeightSum : 1 / remainingTracks;
        return Math.max(0.01, remainingRawSize * ratio);
      }
    });

    updateActiveDrawer(d => ({
      ...d,
      ...(isWidth ? { colWeights: newWeights } : { rowWeights: newWeights })
    }));
  };

  const handleBoxDimInputChange = (boxId, axis, rawValue) => {
    setBoxDimInputs(prev => ({
      ...prev,
      [boxId]: {
        ...(prev[boxId] || {}),
        [axis]: rawValue
      }
    }));

    const parsed = parseFloat(rawValue);
    if (!isNaN(parsed) && parsed >= 10) {
      applyExactBoxDimension(boxId, axis, parsed);
    }
  };

  const handleBoxDimBlur = (box) => {
    setBoxDimInputs(prev => {
      const next = { ...prev };
      delete next[box.id];
      return next;
    });
  };

  const [mobileTab, setMobileTab] = useState('2d');
  const [showTip, setShowTip] = useState(false);

  const [boxSettings] = useState({
    wallThickness: 1.2,
    bottomThickness: 1.2
  });

  const [pricingSettings] = useState({
    plaPricePerKg: 20,
    kwhPrice: 0.25,
    printerPowerW: 150,
    laborFeePerBox: 0.10,
    marginPercent: 300,
    shippingCostBE: 4.30,
    shippingCostFR: 5.50
  });

  const [clientInfo, setClientInfo] = useState({
    country: 'BE',
    name: '',
    email: '',
    phone: '',
    address: '',
    relayPoint: '',
    city: '',
    postalCode: '',
    notes: ''
  });

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const gridContainerRef = useRef(null);

  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const openCustomizationNotes = () => {
    setShowShareModal(true);
    setTimeout(() => {
      if (notesInputRef.current) {
        notesInputRef.current.focus();
        notesInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  };

  const handleHeightMarginChange = (val) => {
    setHeightMarginInput(val);
    const num = parseFloat(val);
    setHeightMargin(!isNaN(num) && num >= 0 ? num : 0);
  };

  const handleClearanceChange = (val) => {
    setClearanceInput(val);
    const num = parseFloat(val);
    setClearance(!isNaN(num) && num >= 0 ? num : 0);
  };

  const calculateBoxCost = (box) => {
    const { width: w, depth: d, height: h } = box;
    const area = w * d;
    const refSmallArea = 120 * 90;
    const ratio = area / refSmallArea;
    
    const weightGrams = Math.max(20, Math.round(37 * ratio * (h / 33)));
    const printTimeHours = Math.max(0.4, (0.75 * ratio * (h / 33)));

    const materialCost = (weightGrams / 1000) * pricingSettings.plaPricePerKg;
    const electricityCost = (pricingSettings.printerPowerW / 1000) * printTimeHours * pricingSettings.kwhPrice;
    const amortizationCost = printTimeHours * 0.20;
    const largeFormatFee = (w > 150 || d > 150) ? 1.00 : 0.00;

    const baseCost = materialCost + electricityCost + amortizationCost + pricingSettings.laborFeePerBox + largeFormatFee;
    const finalPrice = baseCost * 2.6;

    return {
      weightGrams: Math.round(weightGrams),
      printTimeHours: printTimeHours.toFixed(1),
      finalPrice: Math.max(1.50, finalPrice)
    };
  };

  const getAllBoxesFromDrawers = (dList) => {
    let allBoxes = [];
    dList.forEach((dItem) => {
      const cWeights = dItem.colWeights || DEFAULT_WEIGHTS;
      const rWeights = dItem.rowWeights || DEFAULT_WEIGHTS;

      dItem.layout.forEach((item, idx) => {
        const metrics = computeBoxMetrics(
          item,
          dItem.dimensions,
          dItem.clearance,
          dItem.heightMargin,
          cWeights,
          rWeights
        );

        allBoxes.push({
          drawerName: dItem.name,
          drawerId: dItem.id,
          id: item.id,
          width: metrics.width,
          depth: metrics.depth,
          height: metrics.height,
          colSpan: item.colSpan,
          rowSpan: item.rowSpan,
          wallThickness: boxSettings.wallThickness,
          bottomThickness: boxSettings.bottomThickness,
          color: dItem.customColors[item.id] || getDimensionColor(item.colSpan, item.rowSpan, idx)
        });
      });
    });
    return allBoxes;
  };

  const allDrawersBoxes = getAllBoxesFromDrawers(drawersList);

  const boxesSubtotal = allDrawersBoxes.reduce((acc, box) => {
    const cost = calculateBoxCost(box);
    return acc + cost.finalPrice;
  }, 0);

  const totalPrice = boxesSubtotal;
  const shippingCost = allDrawersBoxes.length > 0 
    ? (clientInfo.country === 'FR' ? pricingSettings.shippingCostFR : pricingSettings.shippingCostBE) 
    : 0;
  const totalPriceWithShipping = totalPrice + shippingCost;

  const getOrderSummaryCleanText = () => {
    const countryLabel = clientInfo.country === 'FR' ? 'France' : 'Belgique';
    let summary = `=== DEMANDE DE DEVIS / COMMANDE 3Dr ===\n\n`;
    summary += `--- COORDONNÉES CLIENT (${countryLabel.toUpperCase()}) ---\n`;
    summary += `Pays : ${countryLabel}\n`;
    if (clientInfo.name) summary += `Nom : ${clientInfo.name}\n`;
    if (clientInfo.email) summary += `Email : ${clientInfo.email}\n`;
    if (clientInfo.phone) summary += `Téléphone : ${clientInfo.phone}\n`;
    if (clientInfo.address) summary += `Adresse postale : ${clientInfo.address}\n`;
    if (clientInfo.relayPoint) summary += `Point Mondial Relay : ${clientInfo.relayPoint}\n`;
    if (clientInfo.postalCode || clientInfo.city) summary += `Ville / CP : ${clientInfo.postalCode} ${clientInfo.city}\n`;
    if (clientInfo.notes) summary += `Notes : ${clientInfo.notes}\n\n`;

    summary += `--- INFORMATIONS TECHNIQUES & TARIFS ESTIMÉS ---\n`;
    summary += `Nombre de tiroirs configurés : ${drawersList.length}\n`;
    summary += `Nombre total de compartiments : ${allDrawersBoxes.length}\n`;
    summary += `Sous-total boîtes : ${boxesSubtotal.toFixed(2)} €\n`;
    summary += `Livraison Mondial Relay (${countryLabel}) : ${shippingCost.toFixed(2)} €\n`;
    summary += `PRIX TOTAL ESTIMÉ (avec port) : ${totalPriceWithShipping.toFixed(2)} €\n\n`;
    summary += `--- DÉTAIL DES TIROIRS ET COMPARTIMENTS ---\n`;

    drawersList.forEach((dItem, index) => {
      summary += `\n[TIROIR #${index + 1} : ${dItem.name}]\n`;
      summary += `Dimensions Internes Tiroir : ${dItem.dimensions.width} x ${dItem.dimensions.depth} x ${dItem.dimensions.height} mm\n`;
      summary += `Jeu entre boîtes : ${dItem.clearance} mm | Jeu de hauteur : ${dItem.heightMargin} mm\n`;
      
      const drawerBoxes = allDrawersBoxes.filter(b => b.drawerId === dItem.id);
      drawerBoxes.forEach((b, idx) => {
        summary += `  -> Boîte #${idx + 1} (${b.colSpan}x${b.rowSpan}) : ${b.width} x ${b.depth} x ${b.height} mm - Couleur: ${b.color}\n`;
      });
    });

    return summary;
  };

  const copyOrderSummary = () => {
    navigator.clipboard.writeText(getOrderSummaryCleanText());
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const generateConfigLink = () => {
    const configData = { drawersList };
    const jsonStr = JSON.stringify(configData);
    const encoded = encodeURIComponent(jsonStr);
    return `${window.location.origin}${window.location.pathname}?config=${encoded}&admin=true`;
  };

  const downloadAllSTL = () => {
    let globalIndex = 0;
    drawersList.forEach((dItem) => {
      const cWeights = dItem.colWeights || DEFAULT_WEIGHTS;
      const rWeights = dItem.rowWeights || DEFAULT_WEIGHTS;

      dItem.layout.forEach((item, boxIdx) => {
        globalIndex++;
        const currentIndex = globalIndex;
        setTimeout(() => {
          const metrics = computeBoxMetrics(
            item,
            dItem.dimensions,
            dItem.clearance,
            dItem.heightMargin,
            cWeights,
            rWeights
          );

          const boxObj = {
            width: metrics.width,
            depth: metrics.depth,
            height: metrics.height,
            wallThickness: boxSettings.wallThickness,
            bottomThickness: boxSettings.bottomThickness
          };

          const singleBoxSTL = generateBoxSTL(boxObj);
          const blob = new Blob([singleBoxSTL], { type: 'model/stl' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const sanitizeName = dItem.name.replace(/[^a-zA-Z0-9]/g, '_');
          link.download = `3Dr_${sanitizeName}_Box_${boxIdx + 1}_${metrics.width}x${metrics.depth}x${metrics.height}mm.stl`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, currentIndex * 200);
      });
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const configParam = params.get('config');
    const adminParam = params.get('admin');

    if (adminParam === 'true') {
      setIsAdminMode(true);
    }

    if (configParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(configParam));
        if (parsed.drawersList && parsed.drawersList.length > 0) {
          const hydrated = parsed.drawersList.map(d => ({
            ...d,
            colWeights: d.colWeights || [...DEFAULT_WEIGHTS],
            rowWeights: d.rowWeights || [...DEFAULT_WEIGHTS]
          }));
          setDrawersList(hydrated);
          setActiveDrawerId(hydrated[0].id);
        }
      } catch (err) {
        console.error("Erreur de décodage du lien de configuration :", err);
      }
    }
  }, []);

  const sendEmailOrder = async () => {
    if (!clientInfo.name || !clientInfo.email || !clientInfo.postalCode || !clientInfo.city || !clientInfo.address || !clientInfo.relayPoint) {
      setDimWarning("Veuillez remplir tous les champs obligatoires (Nom, Email, Code Postal, Ville, Adresse postale, Point Mondial Relay).");
      return;
    }

    const oversizedBox = allDrawersBoxes.find(b => b.width > MAX_COMPARTMENT_SIZE || b.depth > MAX_COMPARTMENT_SIZE);
    if (oversizedBox) {
      setDimWarning(`Erreur : Le compartiment (${oversizedBox.width}x${oversizedBox.depth} mm) dépasse la limite maximale autorisée de ${MAX_COMPARTMENT_SIZE}x${MAX_COMPARTMENT_SIZE} mm.`);
      return;
    }

    setIsSending(true);

    const shareableConfigLink = generateConfigLink();
    const cleanSummary = getOrderSummaryCleanText();
    const countryLabel = clientInfo.country === 'FR' ? 'France' : 'Belgique';

    let htmlBoxesList = `<ul style="padding-left: 15px; margin: 0; font-family: sans-serif; font-size: 13px; color: #334155;">`;
    allDrawersBoxes.forEach((b, idx) => {
      htmlBoxesList += `<li style="margin-bottom: 6px;"><strong>Compartiment #${idx + 1}</strong> (${b.drawerName}) : <b>${b.width} × ${b.depth} × ${b.height} mm</b> (Grille ${b.colSpan}×${b.rowSpan} - Couleur: ${b.color})</li>`;
    });
    htmlBoxesList += `</ul>`;

    let htmlDrawersList = `<ul style="padding-left: 15px; margin: 0; font-family: sans-serif; font-size: 13px; color: #334155;">`;
    drawersList.forEach((dItem) => {
      const count = allDrawersBoxes.filter(b => b.drawerId === dItem.id).length;
      htmlDrawersList += `<li style="margin-bottom: 4px;"><strong>${dItem.name}</strong> (Interne : ${dItem.dimensions.width} × ${dItem.dimensions.depth} × ${dItem.dimensions.height} mm) : ${count} boîtes</li>`;
    });
    htmlDrawersList += `</ul>`;

    const templateParams = {
      to_email: '3dr.global@gmail.com',
      client_name: clientInfo.name,
      client_email: clientInfo.email,
      client_phone: clientInfo.phone || 'Non renseigné',
      client_address: `${clientInfo.address}, ${clientInfo.postalCode} ${clientInfo.city} (${countryLabel})`,
      client_relay_point: clientInfo.relayPoint,
      client_notes: clientInfo.notes || 'Aucune note',
      box_count: allDrawersBoxes.length,
      clearance: clearance,
      height_margin: heightMargin,
      total_price: totalPriceWithShipping.toFixed(2),
      boxes_subtotal: boxesSubtotal.toFixed(2),
      shipping_cost: shippingCost.toFixed(2),
      order_summary: cleanSummary,
      html_drawers_list: htmlDrawersList,
      html_boxes_list: htmlBoxesList,
      config_link: shareableConfigLink,
      stl_content: shareableConfigLink
    };

    const SERVICE_ID = 'service_fyg2wy1';
    const PUBLIC_KEY = 'ccGFwjgEOJLKeTkpU';
    const TEMPLATE_DEVIS_ID = 'template_5ynz5gn';
    const TEMPLATE_STL_ID = 'template_d48cfes';

    try {
      if (SERVICE_ID !== 'YOUR_SERVICE_ID' && PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
        const sendEmailRequest = async (templateId) => {
          return fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_id: SERVICE_ID,
              template_id: templateId,
              user_id: PUBLIC_KEY,
              template_params: templateParams
            })
          });
        };

        const resDevis = await sendEmailRequest(TEMPLATE_DEVIS_ID);
        if (!resDevis.ok) {
          const errText = await resDevis.text();
          throw new Error(`EmailJS (Devis): ${resDevis.status} ${errText}`);
        }

        if (TEMPLATE_STL_ID) {
          const resSTL = await sendEmailRequest(TEMPLATE_STL_ID);
          if (!resSTL.ok) {
            const errTextSTL = await resSTL.text();
            console.warn(`EmailJS (STL) avertissement : ${resSTL.status} ${errTextSTL}`);
          }
        }
      } else {
        console.log("EmailJS Params (Simulation REST API) :", templateParams);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      setOrderSent(true);
      setIsSending(false);
    } catch (error) {
      console.error("Erreur d'envoi EmailJS :", error);
      setDimWarning("Une erreur est survenue lors de l'envoi : " + error.message);
      setIsSending(false);
    }
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
      setDimWarning(null);
    }
  };

  const resetLayoutToDefault = () => {
    updateActiveDrawer(d => ({
      ...d,
      colWeights: [...DEFAULT_WEIGHTS],
      rowWeights: [...DEFAULT_WEIGHTS],
      layout: [
        { id: '1', colStart: 0, rowStart: 0, colSpan: 3, rowSpan: 3 },
        { id: '2', colStart: 3, rowStart: 0, colSpan: 3, rowSpan: 3 },
        { id: '3', colStart: 0, rowStart: 3, colSpan: 3, rowSpan: 3 },
        { id: '4', colStart: 3, rowStart: 3, colSpan: 3, rowSpan: 3 }
      ]
    }));
    setSelectionStart(null);
    setSelectionEnd(null);
    setDimWarning(null);
  };

  const clearLayout = () => {
    setLayout([]);
    setSelectionStart(null);
    setSelectionEnd(null);
    setDimWarning(null);
  };

  useEffect(() => {
    const computedBoxes = layout.map((item, idx) => {
      const metrics = computeBoxMetrics(
        item,
        drawer,
        clearance,
        heightMargin,
        colWeights,
        rowWeights
      );

      return {
        id: item.id,
        x: metrics.x,
        y: metrics.y,
        width: metrics.width,
        depth: metrics.depth,
        height: metrics.height,
        colStart: item.colStart,
        rowStart: item.rowStart,
        colSpan: item.colSpan,
        rowSpan: item.rowSpan,
        wallThickness: boxSettings.wallThickness,
        bottomThickness: boxSettings.bottomThickness,
        color: customColors[item.id] || getDimensionColor(item.colSpan, item.rowSpan, idx)
      };
    });

    setBoxes(computedBoxes);
  }, [drawer, heightMargin, clearance, colWeights, rowWeights, layout, customColors]);

  // Détection de la cellule exacte sous le curseur/doigt en tenant compte des largeurs pondérées
  const getCellFromCoords = (clientX, clientY) => {
    if (!gridContainerRef.current) return null;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return null;

    const totalColW = colWeights.reduce((a, b) => a + b, 0) || 6;
    const targetColRatio = x / rect.width;
    let col = gridSize.cols - 1;
    let accCol = 0;
    for (let c = 0; c < gridSize.cols; c++) {
      accCol += colWeights[c] / totalColW;
      if (targetColRatio <= accCol) {
        col = c;
        break;
      }
    }

    const totalRowW = rowWeights.reduce((a, b) => a + b, 0) || 6;
    const targetRowRatio = y / rect.height;
    let row = gridSize.rows - 1;
    let accRow = 0;
    for (let r = 0; r < gridSize.rows; r++) {
      accRow += rowWeights[r] / totalRowW;
      if (targetRowRatio <= accRow) {
        row = r;
        break;
      }
    }

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

    const metrics = computeBoxMetrics(
      bounds,
      drawer,
      clearance,
      heightMargin,
      colWeights,
      rowWeights
    );

    if (metrics.width > MAX_COMPARTMENT_SIZE || metrics.depth > MAX_COMPARTMENT_SIZE) {
      setDimWarning(`Impossible de fusionner : ce compartiment ferait ${metrics.width}×${metrics.depth} mm (max ${MAX_COMPARTMENT_SIZE}×${MAX_COMPARTMENT_SIZE} mm).`);
      return;
    }

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

    const newId = Date.now().toString();
    const newBox = {
      id: newId,
      ...bounds
    };

    setLayout([...filteredLayout, newBox]);
    setSelectedBoxId(newId);
    setSelectionStart(null);
    setSelectionEnd(null);
    setDimWarning(null);
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
        const innerPath = new THREE.Path();
        const inW = b.width - wallT * 2;
        const inD = b.depth - wallT * 2;
        const inR = Math.max(1, cornerRadius - wallT);

        innerPath.moveTo(wallT + inR, wallT);
        innerPath.quadraticCurveTo(wallT, wallT, wallT, wallT + inR);
        innerPath.lineTo(wallT, wallT + inD - inR);
        innerPath.quadraticCurveTo(wallT, wallT + inD, wallT + inR, wallT + inD);
        innerPath.lineTo(wallT + inW - inR, wallT + inD);
        innerPath.quadraticCurveTo(wallT + inW, wallT + inD, wallT + inW, wallT + inD - inR);
        innerPath.lineTo(wallT + inW, wallT + inR);
        innerPath.quadraticCurveTo(wallT + inW, wallT, wallT + inW - inR, wallT);
        innerPath.lineTo(wallT + inR, wallT);

        outerShape.holes.push(innerPath);
      }

      const wallExtrudeSettings = {
        depth: b.height - bottomT,
        bevelEnabled: false
      };
      const wallsGeo = new THREE.ExtrudeGeometry(outerShape, wallExtrudeSettings);
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

  // Pourcentages cumulés des colonnes et lignes pour l'affichage proportionnel du Plan 2D
  const totalColWeight = colWeights.reduce((a, b) => a + b, 0) || 6;
  const totalRowWeight = rowWeights.reduce((a, b) => a + b, 0) || 6;

  const colPercentWidths = colWeights.map(w => (w / totalColWeight) * 100);
  const rowPercentHeights = rowWeights.map(w => (w / totalRowWeight) * 100);

  const colPercentOffsets = [];
  let accC = 0;
  for (let i = 0; i < colPercentWidths.length; i++) {
    colPercentOffsets.push(accC);
    accC += colPercentWidths[i];
  }

  const rowPercentOffsets = [];
  let accR = 0;
  for (let i = 0; i < rowPercentHeights.length; i++) {
    rowPercentOffsets.push(accR);
    accR += rowPercentHeights[i];
  }

  const getSpanRectPercent = (colStart, colSpan, rowStart, rowSpan) => {
    const left = colPercentOffsets[colStart] || 0;
    const top = rowPercentOffsets[rowStart] || 0;
    let width = 0;
    for (let c = colStart; c < colStart + colSpan; c++) width += colPercentWidths[c] || 0;
    let height = 0;
    for (let r = rowStart; r < rowStart + rowSpan; r++) height += rowPercentHeights[r] || 0;
    return { left, top, width, height };
  };

  const isCustomProportioned =
    colWeights.some(w => Math.abs(w - colWeights[0]) > 0.001) ||
    rowWeights.some(w => Math.abs(w - rowWeights[0]) > 0.001);

  const selectionBounds = getSelectionBounds();
  const selectionRect = selectionBounds
    ? getSpanRectPercent(
        selectionBounds.colStart,
        selectionBounds.colSpan,
        selectionBounds.rowStart,
        selectionBounds.rowSpan
      )
    : null;

  const selectionMetrics = selectionBounds
    ? computeBoxMetrics(selectionBounds, drawer, clearance, heightMargin, colWeights, rowWeights)
    : null;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 font-sans text-slate-800 overflow-hidden pb-14 md:pb-0" onMouseUp={handleMouseUp}>
      {isAdminMode && (
        <div className="bg-amber-500 text-slate-900 px-3 py-1.5 flex items-center justify-between text-xs font-bold shrink-0 shadow-md z-30">
          <div className="flex items-center gap-1.5 truncate">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Admin ({drawersList.length} tiroir(s) - {allDrawersBoxes.length} boîte(s))</span>
          </div>
          <button
            onClick={downloadAllSTL}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-extrabold transition flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            STL ({allDrawersBoxes.length})
          </button>
        </div>
      )}

      {/* HEADER DESKTOP */}
      <header className="hidden md:flex bg-white border-b border-slate-200 px-6 py-2.5 items-center justify-between z-10 shadow-xs shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Organisateur Tiroir 3Dr</h1>
            <p className="text-xs text-slate-500">Sur-Mesure & Impression 3D</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowShareModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-200 cursor-pointer min-h-[38px]"
          >
            <span className="bg-amber-400 text-slate-950 w-5 h-5 rounded-full inline-flex items-center justify-center font-black text-[11px] shrink-0">4</span>
            <Send className="w-4 h-4" />
            <span>Passer Commande</span>
          </button>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-1 flex items-center gap-2 min-h-[38px]">
            <div className="p-1 bg-emerald-500 rounded-lg text-white">
              <Euro className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block leading-tight">Total Boîtes ({allDrawersBoxes.length})</span>
              <span className="text-sm font-black text-emerald-700 leading-none">{totalPrice.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </header>

      {/* BANDEAU MES TIROIRS */}
      <div className="bg-slate-800 text-white px-2.5 sm:px-6 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 overflow-x-auto shrink-0 shadow-md z-20">
        <div className="flex items-center gap-1 md:hidden shrink-0 pr-1 border-r border-slate-700">
          <Box className="w-4 h-4 text-indigo-400" />
          <span className="text-[11px] font-black tracking-tight text-indigo-200">3Dr</span>
        </div>
        <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Mes Tiroirs :</span>
        
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none flex-1">
          {drawersList.map((dItem) => {
            const isActive = dItem.id === activeDrawerId;
            return (
              <div
                key={dItem.id}
                onClick={() => {
                  setActiveDrawerId(dItem.id);
                  setDimWarning(null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <span className="truncate max-w-[90px] sm:max-w-none">{dItem.name}</span>
                {drawersList.length > 1 && (
                  <button
                    onClick={(e) => removeDrawer(dItem.id, e)}
                    className="p-0.5 hover:bg-slate-900/40 rounded transition text-slate-300 hover:text-white"
                    title="Supprimer ce tiroir"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        
        <button
          onClick={addNewDrawer}
          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
          title="Ajouter un tiroir"
        >
          <Plus className="w-3.5 h-3.5 md:hidden" />
          <span className="hidden md:inline">+ Ajouter un tiroir</span>
          <span className="md:hidden text-[11px]">Tiroir</span>
        </button>

        <button 
          onClick={() => setShowTip(!showTip)} 
          className="md:hidden p-1 text-slate-300 hover:text-amber-300 transition shrink-0"
          title="Astuces"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {showTip && (
        <div className="md:hidden bg-amber-50 border-b border-amber-200 text-amber-900 p-2.5 text-xs font-medium flex items-start gap-2 shrink-0">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-[11px] leading-tight">
            <strong>Astuce :</strong> Fusionnez vos cases sur le Plan 2D, puis saisissez vos cotes exactes en mm dans l'onglet Boîtes !
          </div>
          <button onClick={() => setShowTip(false)} className="text-amber-700 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* NAVIGATION MOBILES */}
      <div className="md:hidden bg-white p-1 flex justify-around border-b border-slate-200 text-xs font-bold shrink-0 z-10 shadow-xs">
        <button
          onClick={() => setMobileTab('2d')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${mobileTab === '2d' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600'}`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Plan 2D</span>
        </button>
        <button
          onClick={() => setMobileTab('3d')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${mobileTab === '3d' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600'}`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Vue 3D</span>
        </button>
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${mobileTab === 'list' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600'}`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Boîtes ({boxes.length})</span>
        </button>
      </div>

      {/* MODAL DE COMMANDE */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">Passer Commande ({drawersList.length} tiroir(s))</h3>
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
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" /> Coordonnées de Livraison
                  </h4>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-indigo-700 uppercase mb-1 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" /> Pays de livraison *
                  </label>
                  <select
                    value={clientInfo.country}
                    onChange={(e) => setClientInfo({ ...clientInfo, country: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs font-bold text-slate-800 shadow-xs cursor-pointer"
                  >
                    <option value="BE">Belgique (Frais de port Mondial Relay : 4.30 €)</option>
                    <option value="FR">France (Frais de port Mondial Relay : 5.50 €)</option>
                  </select>
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
                    placeholder="Code Postal *"
                    value={clientInfo.postalCode}
                    onChange={(e) => setClientInfo({ ...clientInfo, postalCode: e.target.value })}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Ville *"
                    value={clientInfo.city}
                    onChange={(e) => setClientInfo({ ...clientInfo, city: e.target.value })}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Adresse postale *"
                  value={clientInfo.address}
                  onChange={(e) => setClientInfo({ ...clientInfo, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                />

                <div>
                  <input
                    type="text"
                    placeholder="Point Mondial Relay souhaité *"
                    value={clientInfo.relayPoint}
                    onChange={(e) => setClientInfo({ ...clientInfo, relayPoint: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                  />
                  <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 font-bold p-1.5 rounded-md mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3 text-amber-600 shrink-0" />
                    Uniquement livraison en point relais, Mondial Relay.
                  </p>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" /> Note de commande / Personnalisation
                  </label>
                  <textarea
                    ref={notesInputRef}
                    placeholder="Ex: Je souhaite une couleur spécifique indisponible, un ajustement particulier..."
                    value={clientInfo.notes}
                    onChange={(e) => setClientInfo({ ...clientInfo, notes: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 bg-indigo-50/40 border border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs resize-none"
                  />
                </div>

                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] font-semibold flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Information :</strong> Une fois le devis envoyé, il sera analysé et un e-mail vous sera envoyé pour la demande de paiement sécurisé.
                  </span>
                </div>

                <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1 mt-2">
                  <div className="flex justify-between items-center text-slate-700 font-semibold">
                    <span>Nombre de tiroirs :</span>
                    <span>{drawersList.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 font-semibold">
                    <span>Sous-total boîtes ({allDrawersBoxes.length}) :</span>
                    <span>{boxesSubtotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 font-semibold">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> 
                      Livraison Mondial Relay ({clientInfo.country === 'FR' ? 'France' : 'Belgique'}) :
                    </span>
                    <span>{shippingCost.toFixed(2)} €</span>
                  </div>
                  <div className="border-t border-indigo-200 pt-1 flex justify-between items-center text-indigo-900 font-black text-sm">
                    <span>PRIX TOTAL ESTIMÉ :</span>
                    <span>{totalPriceWithShipping.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={sendEmailOrder}
                  disabled={isSending}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-md shadow-indigo-200 cursor-pointer min-h-[44px]"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSending ? 'Envoi en cours...' : 'Envoyer la demande de devis'}
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
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Demande de devis envoyée !
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        <div className={`w-full md:w-85 bg-white border-r border-slate-200 flex flex-col overflow-y-auto shrink-0 ${mobileTab === '3d' ? 'hidden md:flex' : 'flex'}`}>
          
          {/* BULLE INFO PERSONNALISATION */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-700 text-white shadow-md border-b border-indigo-300 relative overflow-hidden shrink-0">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-[11px] font-semibold leading-snug text-indigo-50">
                  Vous souhaitez une <strong className="text-white font-extrabold underline decoration-amber-300 decoration-2">personnalisation</strong> ou une <strong className="text-white font-extrabold underline decoration-amber-300 decoration-2">couleur indisponible</strong> ? C'est possible !
                </p>
                <p className="text-[10px] text-indigo-100 font-medium">
                  Ajoutez une note dans la commande et on en discute.
                </p>
                <button
                  onClick={openCustomizationNotes}
                  className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black rounded-md shadow-xs transition-transform active:scale-95 cursor-pointer"
                >
                  <span>Ajouter une note</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Section 1 : Dimensions */}
          <div className={`p-3.5 sm:p-4 border-b border-slate-100 space-y-2.5 sm:space-y-3 ${mobileTab === 'list' ? 'hidden md:block' : 'block'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 w-5 h-5 rounded-full inline-flex items-center justify-center font-black text-xs shadow-xs">1</span>
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                Dimensions ({activeDrawer.name})
              </h2>
            </div>
            
            <p className="text-[10px] text-indigo-900 bg-indigo-50 border border-indigo-200 font-bold p-2 rounded-lg flex items-center gap-1.5 leading-tight">
              <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Dimensions internes du tiroir (mm).</span>
            </p>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Longueur</label>
                <input
                  type="number"
                  value={drawerInputs.width}
                  onChange={(e) => handleDrawerInputChange('width', e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Largeur</label>
                <input
                  type="number"
                  value={drawerInputs.depth}
                  onChange={(e) => handleDrawerInputChange('depth', e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Hauteur</label>
                <input
                  type="number"
                  value={drawerInputs.height}
                  onChange={(e) => handleDrawerInputChange('height', e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-indigo-600" /> Jeu entre Boîtes
                  </label>
                </div>
                <div className="relative w-20 sm:w-24">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={clearanceInput}
                    onChange={(e) => handleClearanceChange(e.target.value)}
                    className="w-full px-2 py-1 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 text-right focus:outline-none focus:border-indigo-500 pr-7"
                  />
                  <span className="absolute right-2 top-1 text-[10px] font-bold text-indigo-400 pointer-events-none">mm</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1">
                    <ArrowDown className="w-3 h-3 text-indigo-600" /> Jeu de Hauteur
                  </label>
                </div>
                <div className="relative w-20 sm:w-24">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={heightMarginInput}
                    onChange={(e) => handleHeightMarginChange(e.target.value)}
                    className="w-full px-2 py-1 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 text-right focus:outline-none focus:border-indigo-500 pr-7"
                  />
                  <span className="absolute right-2 top-1 text-[10px] font-bold text-indigo-400 pointer-events-none">mm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 : Plan 2D */}
          <div className={`p-3.5 sm:p-4 border-b border-slate-100 ${mobileTab === 'list' ? 'hidden md:block' : 'block'}`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 w-5 h-5 rounded-full inline-flex items-center justify-center font-black text-xs shadow-xs">2</span>
                <Grid className="w-3.5 h-3.5 text-indigo-600" />
                Plan 2D ({activeDrawer.name})
              </h2>
              <div className="flex items-center gap-1">
                {isCustomProportioned && (
                  <button
                    onClick={resetWeights}
                    className="px-1.5 py-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                    title="Réinitialiser les proportions (grille régulière)"
                  >
                    <Scaling className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Proportions</span>
                  </button>
                )}
                <button
                  onClick={clearLayout}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition flex items-center gap-1 text-[10px] font-medium cursor-pointer"
                  title="Vider ce tiroir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Vider
                </button>
                <button
                  onClick={resetLayoutToDefault}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                  title="Réinitialiser la grille"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-[10px] text-indigo-900 bg-indigo-50 border border-indigo-200 font-bold p-2 rounded-lg mb-2.5 flex items-center gap-1.5 leading-tight">
              <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Glissez sur la grille pour fusionner, puis ajustez les mm exacts ci-dessous.</span>
            </p>

            <div 
              ref={gridContainerRef}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => setIsSelecting(false)}
              style={{ aspectRatio: `${drawer.width} / ${drawer.depth}` }}
              className="relative w-full max-h-[300px] mx-auto border-2 border-slate-300 rounded-xl bg-slate-50 overflow-hidden shadow-inner select-none touch-none"
            >
              {/* Calque 0 : Compartiments aux dimensions pondérées réelles */}
              <div className="absolute inset-0 z-0">
                {boxes.map((b) => {
                  const rect = getSpanRectPercent(b.colStart, b.colSpan, b.rowStart, b.rowSpan);
                  const isLightColor = b.color === '#e2e8f0' || b.color === '#FFD700';
                  const isSelected = b.id === selectedBoxId;

                  return (
                    <div
                      key={b.id}
                      className={`absolute rounded-lg flex flex-col items-center justify-center transition-all shadow-xs p-0.5 overflow-hidden ${
                        isSelected
                          ? 'ring-2 ring-indigo-600 z-10'
                          : isLightColor
                          ? 'border-2 border-slate-400'
                          : 'border-2 border-white/80'
                      }`}
                      style={{
                        left: `${rect.left}%`,
                        top: `${rect.top}%`,
                        width: `${rect.width}%`,
                        height: `${rect.height}%`,
                        backgroundColor: b.color
                      }}
                    >
                      <span className={`text-[10px] font-black leading-tight shadow-xs px-1.5 py-0.5 rounded text-center truncate max-w-full ${
                        isLightColor ? 'text-slate-900 bg-slate-900/10 backdrop-blur-xs' : 'text-slate-900 bg-white/90'
                      }`}>
                        {b.width}×{b.depth}
                      </span>
                      {rect.width > 18 && rect.height > 18 && (
                        <span className="text-[8px] font-bold text-slate-900/75 mt-0.5 leading-none">
                          {b.colSpan}×{b.rowSpan}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Calque 1 : Grille pointillée pondérée */}
              <div
                className="absolute inset-0 z-10 pointer-events-none grid"
                style={{
                  gridTemplateColumns: colWeights.map(w => `${w}fr`).join(' '),
                  gridTemplateRows: rowWeights.map(w => `${w}fr`).join(' ')
                }}
              >
                {Array.from({ length: 36 }).map((_, idx) => (
                  <div key={idx} className="border border-dashed border-slate-900/20" />
                ))}
              </div>

              {/* Calque 2 : Sélection en cours */}
              {selectionRect && (
                <div
                  className="absolute z-20 border-2 border-indigo-600 bg-indigo-500/30 rounded-lg pointer-events-none transition-all flex items-center justify-center"
                  style={{
                    left: `${selectionRect.left}%`,
                    top: `${selectionRect.top}%`,
                    width: `${selectionRect.width}%`,
                    height: `${selectionRect.height}%`
                  }}
                >
                  {selectionMetrics && (
                    <span className="bg-indigo-700 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow">
                      {selectionMetrics.width}×{selectionMetrics.depth} mm
                    </span>
                  )}
                </div>
              )}

              {/* Calque 3 : Cellules interactives pondérées */}
              <div
                className="absolute inset-0 z-30 grid cursor-pointer"
                style={{
                  gridTemplateColumns: colWeights.map(w => `${w}fr`).join(' '),
                  gridTemplateRows: rowWeights.map(w => `${w}fr`).join(' ')
                }}
              >
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

            {selectionBounds && selectionMetrics && (
              <button
                onClick={mergeSelectedArea}
                className="mt-2.5 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Combine className="w-4 h-4" />
                Fusionner ({selectionMetrics.width}×{selectionMetrics.depth} mm)
              </button>
            )}
          </div>

          {/* Section 3 : Boîtes & Cotes Exactes */}
          <div className={`p-3.5 sm:p-4 flex-1 ${mobileTab === '2d' ? 'hidden md:block' : 'block'}`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 w-5 h-5 rounded-full inline-flex items-center justify-center font-black text-xs shadow-xs">3</span>
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Boîtes & Cotes Exactes ({boxes.length})
              </h2>
              {isCustomProportioned && (
                <button
                  onClick={resetWeights}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Réinit. proportions
                </button>
              )}
            </div>

            {dimWarning && (
              <div className="mb-2.5 p-2 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-[10px] font-bold flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span className="flex-1">{dimWarning}</span>
                <button onClick={() => setDimWarning(null)} className="text-amber-700 hover:text-amber-950">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <p className="text-[10px] text-indigo-900 bg-indigo-50 border border-indigo-200 font-bold p-2 rounded-lg mb-2.5 flex items-center gap-1.5 leading-tight">
              <Scaling className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Saisissez vos dimensions exactes (mm) : les boîtes voisines s'ajustent automatiquement.</span>
            </p>

            {/* Liste unifiée Desktop & Mobile avec saisie directe Longueur/Largeur mm + couleur */}
            <div className="space-y-2.5">
              {boxes.map((box, idx) => {
                const isPickerOpen = activeColorPickerId === box.id;
                const isSelected = selectedBoxId === box.id;
                const widthInputVal = boxDimInputs[box.id]?.width ?? String(box.width);
                const depthInputVal = boxDimInputs[box.id]?.depth ?? String(box.depth);
                const fullWidthLocked = box.colSpan >= gridSize.cols;
                const fullDepthLocked = box.rowSpan >= gridSize.rows;

                return (
                  <div key={box.id} className="relative">
                    <div 
                      onClick={() => setSelectedBoxId(isSelected ? null : box.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer space-y-2 ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-xs' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveColorPickerId(isPickerOpen ? null : box.id);
                            }}
                            className="w-6 h-6 rounded-full flex-shrink-0 border-2 border-white ring-2 ring-slate-200 hover:scale-110 transition-transform shadow-xs cursor-pointer"
                            style={{ backgroundColor: box.color }}
                            title="Changer la couleur"
                          />

                          <div>
                            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span>Compartiment #{idx + 1}</span>
                              <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {box.colSpan}×{box.rowSpan}
                              </span>
                            </h4>
                            <p className="text-[10px] text-slate-500 font-mono">
                              Hauteur : {box.height} mm
                            </p>
                          </div>
                        </div>

                        {/* Pastilles rapides sur mobile */}
                        <div className="flex md:hidden items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {standardColors.filter(c => !c.disabled).map(c => (
                            <button
                              key={c.name}
                              onClick={() => setCustomColors(prev => ({ ...prev, [box.id]: c.hex }))}
                              className={`w-4 h-4 rounded-full border transition ${box.color === c.hex ? 'ring-2 ring-indigo-500 scale-110 border-white' : 'border-slate-300 opacity-80'}`}
                              style={{ backgroundColor: c.hex }}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Champs d'édition directe des cotes exactes (Longueur / Largeur en mm) */}
                      <div 
                        className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">
                            Longueur (mm)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              min={MIN_TRACK_SIZE}
                              max={MAX_COMPARTMENT_SIZE}
                              disabled={fullWidthLocked}
                              value={widthInputVal}
                              onFocus={() => setSelectedBoxId(box.id)}
                              onChange={(e) => handleBoxDimInputChange(box.id, 'width', e.target.value)}
                              onBlur={() => handleBoxDimBlur(box)}
                              title={fullWidthLocked ? "Occupe toute la longueur du tiroir" : "Saisir la longueur exacte en mm"}
                              className={`w-full px-2 py-1 rounded-lg text-xs font-bold border focus:outline-none pr-6 ${
                                fullWidthLocked
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : 'bg-indigo-50/60 text-indigo-900 border-indigo-200 focus:border-indigo-500 focus:bg-white'
                              }`}
                            />
                            <span className="absolute right-1.5 top-1.5 text-[9px] font-bold text-slate-400 pointer-events-none">mm</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">
                            Largeur (mm)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              min={MIN_TRACK_SIZE}
                              max={MAX_COMPARTMENT_SIZE}
                              disabled={fullDepthLocked}
                              value={depthInputVal}
                              onFocus={() => setSelectedBoxId(box.id)}
                              onChange={(e) => handleBoxDimInputChange(box.id, 'depth', e.target.value)}
                              onBlur={() => handleBoxDimBlur(box)}
                              title={fullDepthLocked ? "Occupe toute la largeur du tiroir" : "Saisir la largeur exacte en mm"}
                              className={`w-full px-2 py-1 rounded-lg text-xs font-bold border focus:outline-none pr-6 ${
                                fullDepthLocked
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : 'bg-indigo-50/60 text-indigo-900 border-indigo-200 focus:border-indigo-500 focus:bg-white'
                              }`}
                            />
                            <span className="absolute right-1.5 top-1.5 text-[9px] font-bold text-slate-400 pointer-events-none">mm</span>
                          </div>
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
                            disabled={c.disabled}
                            onClick={() => {
                              if (c.disabled) return;
                              setCustomColors(prev => ({ ...prev, [box.id]: c.hex }));
                              setActiveColorPickerId(null);
                            }}
                            className={`flex flex-col items-center gap-1 p-1 rounded-lg transition group ${
                              c.disabled ? 'opacity-40 cursor-not-allowed bg-slate-100' : 'hover:bg-slate-100 cursor-pointer'
                            }`}
                            title={c.disabled ? `${c.name} (Non disponible)` : c.name}
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

        {/* RENDU 3D */}
        <div className={`flex-1 relative bg-slate-100 w-full h-full min-h-[300px] ${mobileTab === '3d' || window.innerWidth >= 768 ? 'flex' : 'hidden'}`}>
          <div ref={mountRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />
          
          <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur border border-slate-200 p-2 rounded-xl text-[10px] text-slate-600 shadow-xs flex items-center gap-1.5 pointer-events-none z-10">
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Vue 3D ({activeDrawer.name})</span>
          </div>
        </div>
      </div>

      {/* BARRE ACTION FIXE BAS MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-between z-40 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500 rounded-lg text-white">
            <Euro className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Total ({allDrawersBoxes.length})</span>
            <span className="text-sm font-black text-emerald-600 leading-tight">{totalPrice.toFixed(2)} €</span>
          </div>
        </div>

        <button
          onClick={() => setShowShareModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-200 cursor-pointer active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Devis & Commande</span>
        </button>
      </div>
    </div>
  );
}