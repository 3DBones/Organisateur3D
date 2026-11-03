import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Box, 
  Euro, 
  Printer, 
  Maximize2, 
  Combine, 
  RotateCcw, 
  Lock, 
  Layers, 
  Download, 
  Eye,
  Trash2,
  Share2,
  Send,
  Check,
  Copy,
  X,
  Grid
} from 'lucide-react';

// Attribution d'une couleur basée sur les dimensions (colSpan x rowSpan)
const getDimensionColor = (colSpan, rowSpan) => {
  const key = `${colSpan}x${rowSpan}`;
  const colorMap = {
    '1x1': '#2563eb', // Bleu royal
    '1x2': '#10b981', // Vert émeraude
    '2x1': '#f97316', // Orange vif
    '2x2': '#eab308', // Jaune doré vif
    '1x3': '#ec4899', // Rose fuchsia
    '3x1': '#06b6d4', // Cyan intense
    '2x3': '#059669', // Vert menthe foncé
    '3x2': '#14b8a6', // Turquoise
    '3x3': '#6366f1', // Indigo
    '4x1': '#84cc16', // Vert Lime
    '1x4': '#d946ef', // Magenta
    '4x2': '#dc2626', // Rouge vif
    '2x4': '#9333ea', // Violet néon intense
    '4x4': '#0284c7'  // Bleu océan
  };
  return colorMap[key] || '#64748b';
};

// Fonction de génération STL binaire / ASCII pour les boîtes avec coins arrondis
const generateBoxSTL = (box) => {
  const { width: w, depth: d, height: h, wallThickness: t, bottomThickness: b } = box;

  let stl = `solid drawer_box_${w}x${d}x${h}\n`;

  const addFacet = (n, v1, v2, v3) => {
    stl += `facet normal ${n[0]} ${n[1]} ${n[2]}\n`;
    stl += `  outer loop\n`;
    stl += `    vertex ${v1[0]} ${v1[1]} ${v1[2]}\n`;
    stl += `    vertex ${v2[0]} ${v2[1]} ${v2[2]}\n`;
    stl += `    vertex ${v3[0]} ${v3[1]} ${v3[2]}\n`;
    stl += `  endloop\n`;
    stl += `endfacet\n`;
  };

  const addQuad = (v1, v2, v3, v4, normal) => {
    addFacet(normal, v1, v2, v3);
    addFacet(normal, v1, v3, v4);
  };

  // Base rectangulaire simplifiée
  const p1 = [0, 0, 0], p2 = [w, 0, 0], p3 = [w, d, 0], p4 = [0, d, 0];
  const p1b = [0, 0, b], p2b = [w, 0, b], p3b = [w, d, b], p4b = [0, d, b];
  
  // Fond inférieur
  addQuad(p1, p4, p3, p2, [0, 0, -1]);
  // Parois extérieures simples
  addQuad(p1, p2, p2b, p1b, [0, -1, 0]);
  addQuad(p2, p3, p3b, p2b, [1, 0, 0]);
  addQuad(p3, p4, p4b, p3b, [0, 1, 0]);
  addQuad(p4, p1, p1b, p4b, [-1, 0, 0]);

  // Intérieur
  const i1 = [t, t, b], i2 = [w - t, t, b], i3 = [w - t, d - t, b], i4 = [t, d - t, b];
  const i1h = [t, t, h], i2h = [w - t, t, h], i3h = [w - t, d - t, h], i4h = [t, d - t, h];

  // Fond intérieur
  addQuad(i1, i2, i3, i4, [0, 0, 1]);
  // Parois intérieures
  addQuad(i1, i1h, i2h, i2, [0, 1, 0]);
  addQuad(i2, i2h, i3h, i3, [-1, 0, 0]);
  addQuad(i3, i3h, i4h, i4, [0, -1, 0]);
  addQuad(i4, i4h, i1h, i1, [1, 0, 0]);

  // Bord supérieur
  const p1h = [0, 0, h], p2h = [w, 0, h], p3h = [w, d, h], p4h = [0, d, h];
  addQuad(p1h, p1b, i1h, i1h, [0, 0, 1]); // Bordures hautes
  addQuad(p1h, p2h, i2h, i1h, [0, 0, 1]);
  addQuad(p2h, p3h, i3h, i2h, [0, 0, 1]);
  addQuad(p3h, p4h, i4h, i3h, [0, 0, 1]);
  addQuad(p4h, p1h, i1h, i4h, [0, 0, 1]);

  stl += `endsolid drawer_box_${w}x${d}x${h}\n`;
  return stl;
};

// Helper pour créer une forme 2D arrondie pour Three.js (avec congé de 8mm)
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

// Application Principale
export default function App() {
  // --- ÉTATS PARAMÈTRES DU TIROIR ---
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

  // Paramètres physiques des boîtes (en mm)
  const [boxSettings] = useState({
    wallThickness: 1.2,
    bottomThickness: 1.2,
    clearance: 0.5
  });

  // Paramètres financiers et de calcul
  const [pricingSettings] = useState({
    plaPricePerKg: 20,       // 20 € / kg
    kwhPrice: 0.25,          // 0.25 € / kWh
    printerPowerW: 150,      // 150 Watts
    laborFeePerBox: 0.10,    // 0.10 € forfait par boîte
    marginPercent: 300       // Marge de 300%
  });

  // Couleurs standards disponibles
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

  // Interactions grille 2D
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);

  // État pour la fenêtre modale de partage / commande
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Charger la configuration depuis l'URL au démarrage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const configParam = params.get('config');
    if (configParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(configParam)));
        if (decoded.drawerInputs) setDrawerInputs(decoded.drawerInputs);
        if (decoded.drawer) setDrawer(decoded.drawer);
        if (decoded.layout) setLayout(decoded.layout);
        if (decoded.customColors) setCustomColors(decoded.customColors);
      } catch (e) {
        console.error("Erreur lors du chargement de la configuration", e);
      }
    }
  }, []);

  // Générer l'URL de partage
  const getShareableUrl = () => {
    const config = {
      drawerInputs,
      drawer,
      layout,
      customColors
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(config)));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?config=${encoded}`;
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(getShareableUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Récapitulatif texte pour devis/commande
  const getOrderSummaryText = () => {
    let summary = `=== COMMANDE ORGANISATEUR DE TIROIR ===\n\n`;
    summary += `Dimensions tiroir : ${drawer.width} x ${drawer.depth} x ${drawer.height} mm\n`;
    summary += `Nombre de compartiments : ${boxes.length}\n`;
    summary += `Prix total estimé : ${totalPrice.toFixed(2)} €\n\n`;
    summary += `Détail des pièces à fabriquer :\n`;
    
    boxes.forEach((b, idx) => {
      summary += `- Compartiment #${idx + 1} (${b.colSpan}x${b.rowSpan}) : ${b.width} x ${b.depth} x ${b.height} mm [Couleur: ${b.color}]\n`;
    });

    summary += `\nLien de la configuration :\n${getShareableUrl()}`;
    return summary;
  };

  const copyOrderSummary = () => {
    navigator.clipboard.writeText(getOrderSummaryText());
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Références Three.js
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const boxesGroupRef = useRef(null);

  // Mise à jour des valeurs du tiroir
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

  // Calcul du volume, poids, temps d'impression et prix d'une boîte
  const calculateBoxCost = (box) => {
    const { width: w, depth: d, height: h, wallThickness: t, bottomThickness: b } = box;
    
    // Volume exact de la matière en cm3
    const outerVolume = (w * d * h) / 1000;
    const innerVolume = Math.max(0, ((w - 2 * t) * (d - 2 * t) * (h - b)) / 1000);
    const materialVolumeCm3 = Math.max(0, outerVolume - innerVolume);

    // Masse en grammes (Densité PLA = 1.24 g/cm3)
    const weightGrams = materialVolumeCm3 * 1.24;

    // Coût matière
    const materialCost = (weightGrams / 1000) * pricingSettings.plaPricePerKg;

    // Temps d'impression estimé (Débit moyen ~18 cm3/h)
    const printTimeHours = materialVolumeCm3 / 18;

    // Coût électricité
    const electricityCost = (pricingSettings.printerPowerW / 1000) * printTimeHours * pricingSettings.kwhPrice;

    // Coût de revient de base
    const baseCost = materialCost + electricityCost + pricingSettings.laborFeePerBox;

    // Prix de vente final recommandé (+ Marge %)
    const finalPrice = baseCost * (1 + pricingSettings.marginPercent / 100);

    return {
      weightGrams: Math.round(weightGrams),
      printTimeHours: printTimeHours.toFixed(1),
      materialCost: materialCost.toFixed(2),
      electricityCost: electricityCost.toFixed(2),
      finalPrice: Math.max(0.80, finalPrice)
    };
  };

  // Prix total de l'aménagement
  const totalPrice = boxes.reduce((acc, box) => {
    const cost = calculateBoxCost(box);
    return acc + cost.finalPrice;
  }, 0);

  // Télécharger le fichier STL d'une boîte
  const downloadBoxSTL = (box) => {
    const stlData = generateBoxSTL(box);
    const blob = new Blob([stlData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `boite_${box.width}x${box.depth}x${box.height}mm.stl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calcul des boîtes physiques à partir de la grille
  useEffect(() => {
    const unitWidth = drawer.width / gridSize.cols;
    const unitDepth = drawer.depth / gridSize.rows;
    const clearance = boxSettings.clearance;

    const computedBoxes = layout.map((item) => {
      const rawWidth = item.colSpan * unitWidth;
      const rawDepth = item.rowSpan * unitDepth;

      const boxWidth = Math.max(10, Math.round((rawWidth - clearance) * 10) / 10);
      const boxDepth = Math.max(10, Math.round((rawDepth - clearance) * 10) / 10);
      const boxHeight = Math.max(10, Math.round((drawer.height - 2) * 10) / 10);

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
  }, [drawer, layout, customColors]);

  // Interaction Grille 2D à la souris
  const handleCellMouseDown = (r, c) => {
    setIsMouseDown(true);
    setSelectionStart({ row: r, col: c });
    setSelectionEnd({ row: r, col: c });
  };

  const handleCellMouseEnter = (r, c) => {
    if (isMouseDown) {
      setSelectionEnd({ row: r, col: c });
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
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

    // Filtrer les boîtes qui chevauchent la zone sélectionnée
    const filteredLayout = layout.filter(box => {
      const boxColEnd = box.colStart + box.colSpan - 1;
      const boxRowEnd = box.rowStart + box.rowSpan - 1;

      const selColEnd = bounds.colStart + bounds.colSpan - 1;
      const selRowEnd = bounds.rowStart + bounds.rowSpan - 1;

      const overlap = !(
        boxColEnd < bounds.colStart ||
        box.colStart > selColEnd ||
        boxRowEnd < bounds.rowStart ||
        box.rowStart > selRowEnd
      );
      return !overlap;
    });

    const newBox = {
      id: Date.now().toString(),
      ...bounds
    };

    setLayout([...filteredLayout, newBox]);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // Scène Three.js
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f1f5f9');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(drawer.width * 0.8, drawer.height * 2.5, drawer.depth * 1.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(200, 400, 200);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const boxesGroup = new THREE.Group();
    scene.add(boxesGroup);
    boxesGroupRef.current = boxesGroup;

    // Animation loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Redessiner le tiroir et les boîtes dans Three.js
  useEffect(() => {
    if (!sceneRef.current || !boxesGroupRef.current) return;

    const group = boxesGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // Tiroir translucide (Repère)
    const drawerGeo = new THREE.BoxGeometry(drawer.width, drawer.height, drawer.depth);
    const drawerMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.15,
      wireframe: false
    });
    const drawerMesh = new THREE.Mesh(drawerGeo, drawerMat);
    drawerMesh.position.set(drawer.width / 2, drawer.height / 2, drawer.depth / 2);
    group.add(drawerMesh);

    // Contour du tiroir
    const edges = new THREE.EdgesGeometry(drawerGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.position.copy(drawerMesh.position);
    group.add(wireframe);

    // Ajouter chaque boîte (Modélisation réaliste creuse avec congés)
    boxes.forEach((b) => {
      const isSelected = b.id === selectedBoxId;
      const wallT = b.wallThickness;
      const bottomT = b.bottomThickness;
      const cornerRadius = 8; // Congé extérieur de 8mm

      // Forme extérieure arrondie
      const outerShape = createRoundedBoxShape(b.width, b.depth, cornerRadius);

      // Trou intérieur (parois)
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

      // Parois extruded
      const extrudeSettings = {
        depth: b.height - bottomT,
        bevelEnabled: false
      };
      const wallsGeo = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
      wallsGeo.rotateX(-Math.PI / 2);

      // Fond de la boîte
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

  const selectionBounds = getSelectionBounds();

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 font-sans text-slate-800 overflow-hidden" onMouseUp={handleMouseUp}>
      {/* HEADER PRINCIPAL */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-10 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Organisateur de Tiroir Sur-Mesure</h1>
            <p className="text-xs text-slate-500">Conception 2D/3D & Export STL pour impression 3D</p>
          </div>
        </div>

        {/* PRIX TOTAL ESTIMÉ & BOUTONS D'ACTION */}
        <div className="flex items-center space-x-3">
          <button
            onClick={copyShareLink}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 cursor-pointer"
            title="Copier le lien de cette configuration"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-600" />}
            <span>{copiedLink ? 'Lien copié !' : 'Partager'}</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="px-3 text-xs py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-200 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Commander / Devis</span>
          </button>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-1.5 flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500 rounded-lg text-white">
              <Euro className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Prix Total Estimé</span>
              <span className="text-sm font-black text-emerald-700 leading-none">{totalPrice.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </header>

      {/* MODALE DE PARTAGE / COMMANDE */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">Partager ou Commander cette composition</h3>
              </div>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* LIEN UNIQUE DE LA CONFIGURATION */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Lien direct de la configuration</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareableUrl()}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 select-all focus:outline-none"
                  />
                  <button
                    onClick={copyShareLink}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Copié' : 'Copier'}
                  </button>
                </div>
              </div>

              {/* RÉCAPITULATIF POUR DEVIS */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Récapitulatif de la commande</label>
                <textarea
                  readOnly
                  rows={7}
                  value={getOrderSummaryText()}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyOrderSummary}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-200"
                >
                  {copiedSummary ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedSummary ? 'Récapitulatif copié !' : 'Copier le récapitulatif'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU PRINCIPAL */}
      <div className="flex-1 flex overflow-hidden">
        {/* PANNEAU GAUCHE: CONTROLES & SELECTION */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
          {/* SECTION TIROIR DIMENSIONS */}
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
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Profondeur</label>
                <input
                  type="number"
                  value={drawerInputs.depth}
                  onChange={(e) => handleDrawerInputChange('depth', e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Hauteur</label>
                <input
                  type="number"
                  value={drawerInputs.height}
                  onChange={(e) => handleDrawerInputChange('height', e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* SEC 3: EDITEUR 2D 4X4 */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Grid className="w-3.5 h-3.5 text-indigo-600" />
                Plan 2D (Grille 4x4)
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearLayout}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition flex items-center gap-1 text-[10px] font-medium"
                  title="Vider entièrement le tiroir"
                >
                  <Trash2 className="w-3 h-3" />
                  Vider
                </button>
                <button
                  onClick={resetLayoutToDefault}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition"
                  title="Réinitialiser en 4 compartiments"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              Cliquez et glissez sur la grille pour sélectionner une zone, puis fusionnez-la.
            </p>

            {/* GRILLE 2D INTERACTIVE (4x4) */}
            <div className="relative w-full aspect-square border-2 border-slate-300 rounded-xl bg-slate-50 overflow-hidden shadow-inner select-none">
              
              {/* COUCHE DES BOÎTES EXISTANTES */}
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

              {/* OVERLAY POINTILLÉS DE LA GRILLE 4x4 (Toujours visible au-dessus) */}
              <div className="absolute inset-0 z-10 pointer-events-none grid grid-cols-4 grid-rows-4">
                {Array.from({ length: 16 }).map((_, idx) => (
                  <div key={idx} className="border border-dashed border-slate-900/25" />
                ))}
              </div>

              {/* ZONE DE SÉLECTION EN COURS (BLEU DE SÉLECTION) */}
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

              {/* GRILLE CIBLE DES ÉVÉNEMENTS SOURIS (PREMIER PLAN INTERACTIF) */}
              <div className="absolute inset-0 z-30 grid grid-cols-4 grid-rows-4 cursor-pointer">
                {Array.from({ length: gridSize.rows }).map((_, r) =>
                  Array.from({ length: gridSize.cols }).map((_, c) => (
                    <div
                      key={`${r}-${c}`}
                      onMouseDown={() => handleCellMouseDown(r, c)}
                      onMouseEnter={() => handleCellMouseEnter(r, c)}
                      className="w-full h-full"
                    />
                  ))
                )}
              </div>
            </div>

            {/* BOUTON CONTEXTUEL DE FUSION */}
            {selectionBounds && (
              <button
                onClick={mergeSelectedArea}
                className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Combine className="w-4 h-4" />
                Fusionner la zone ({selectionBounds.colSpan}×{selectionBounds.rowSpan})
              </button>
            )}
          </div>

          {/* SEC 4: LISTE ET EXPORT INDIVIDUEL */}
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Boîtes à Imprimer ({boxes.length})
              </h2>
            </div>

            <div className="space-y-1.5">
              {boxes.map((box, idx) => {
                const isPickerOpen = activeColorPickerId === box.id;

                return (
                  <div key={box.id} className="relative">
                    <div 
                      onClick={() => setSelectedBoxId(box.id === selectedBoxId ? null : box.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        selectedBoxId === box.id 
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        {/* Cercle de couleur cliquable */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveColorPickerId(isPickerOpen ? null : box.id);
                            }}
                            className="w-4 h-4 rounded-full flex-shrink-0 border border-black/20 hover:scale-125 transition-transform shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                            style={{ backgroundColor: box.color }}
                            title="Cliquer pour changer la couleur"
                          />
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Compartiment #{idx + 1}</h4>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {box.width}×{box.depth}×{box.height} mm
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadBoxSTL(box);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition"
                        title="Télécharger ce fichier STL"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Popover de sélection de couleur */}
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

        {/* PANNEAU DROIT: RENDU 3D THREE.JS */}
        <div className="flex-1 relative bg-slate-100">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
          
          <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur border border-slate-200 p-3 rounded-xl text-[11px] text-slate-600 shadow-sm flex items-center gap-2 pointer-events-none">
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>Glisser pour faire tourner la vue 3D • Molette pour zoomer</span>
          </div>
        </div>
      </div>
    </div>
  );
}