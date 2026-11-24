/**
 * Componente Mapa - Integração com Leaflet para busca de estabelecimentos.
 * Mobile-first: lista por padrão, mapa em toggle. Clustering de marcadores.
 */

import { forwardRef, useRef, useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './Mapa.css';
import { Icone, usarIconeBruto } from './Icone';
import type { Estabelecimento } from '@/tipos';
import L from 'leaflet';
import 'leaflet.markercluster';

interface MapaProps {
  estabelecimentos: Estabelecimento[];
  centroInicial?: [number, number];
  zoomInicial?: number;
  aoSelecionar?: (_estabelecimento: Estabelecimento) => void;
  className?: string;
  'data-testid'?: string;
}

const ICONE_PADRAO = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path fill="#e11d48" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

const ICONE_SELECIONADO = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
      <path fill="#0ea5e9" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      <circle cx="12" cy="9.5" r="4" fill="white" opacity="0.3"/>
    </svg>
  `),
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

/** Componente interno para capturar eventos do mapa */
const MapEvents = () => {
  useMapEvents({
    zoomend: () => { },
    moveend: () => { },
  });

  return null;
};

const Mapa = forwardRef<HTMLDivElement, MapaProps>(
  (
    {
      estabelecimentos,
      centroInicial = [-19.92, -43.94], // Belo Horizonte
      zoomInicial = 12,
      aoSelecionar,
      className = '',
      'data-testid': testId,
    },
    ref
  ) => {
    const [estabelecimentoSelecionado, setEstabelecimentoSelecionado] = useState<Estabelecimento | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.MarkerClusterGroup | null>(null);

    const handleMarkerClick = useCallback((estabelecimento: Estabelecimento) => {
      setEstabelecimentoSelecionado(estabelecimento);
      if (aoSelecionar) {
        aoSelecionar(estabelecimento);
      }
    }, [aoSelecionar]);

    // Configurar cluster group quando mapa estiver pronto
    // Inicializar cluster group quando mapa estiver pronto via ref
    const mapContainerRef = useRef<L.Map | null>(null);

    useEffect(() => {
      if (mapContainerRef.current && !markersRef.current) {
        const map = mapContainerRef.current;
        const clusterGroup = L.markerClusterGroup({
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          maxClusterRadius: 50,
          iconCreateFunction: (cluster: L.MarkerCluster) => {
            const count = cluster.getChildCount();
            let size = 'pequeno';
            if (count >= 100) size = 'grande';
            else if (count >= 10) size = 'medio';
            return L.divIcon({
              html: `<div class="mapa__cluster mapa__cluster--${size}"><span>${count}</span></div>`,
              className: 'mapa__cluster-wrapper',
              iconSize: size === 'grande' ? [50, 50] : size === 'medio' ? [40, 40] : [30, 30],
            });
          },
        });
        markersRef.current = clusterGroup;
        map.addLayer(clusterGroup);
        mapRef.current = map;
      }
    }, []);

    // Atualizar marcadores quando estabelecimentos ou seleção mudam
    useEffect(() => {
      if (markersRef.current && mapRef.current) {
        markersRef.current.clearLayers();

        estabelecimentos
          .filter((e) => e.latitude && e.longitude)
          .forEach((estabelecimento) => {
            const isSelecionado = estabelecimentoSelecionado?.id === estabelecimento.id;
            const marker = L.marker(
              [estabelecimento.latitude!, estabelecimento.longitude!],
              { icon: isSelecionado ? ICONE_SELECIONADO : ICONE_PADRAO }
            );

            const iconeEstrela = usarIconeBruto('estrela');
            const popupContent = `
              <div class="mapa__popup-conteudo">
                <strong>${estabelecimento.nome}</strong>
                <p>${estabelecimento.cidade}</p>
                <p class="mapa__popup-avaliacao">
                  ${iconeEstrela} ${estabelecimento.avaliacao?.toFixed(1) || '–'}
                  <span>(${estabelecimento.avaliacoes?.length || 0})</span>
                </p>
                <span class="mapa__popup-nicho">${estabelecimento.nicho}</span>
              </div>
            `;

            marker.bindPopup(popupContent, { className: 'mapa__popup' });
            marker.on('click', () => handleMarkerClick(estabelecimento));
            markersRef.current!.addLayer(marker);
          });
      }
    }, [estabelecimentos, estabelecimentoSelecionado, handleMarkerClick]);

    if (estabelecimentos.length === 0) {
      return (
        <div ref={ref} className={`mapa mapa--vazio ${className}`} data-testid={testId} role="region" aria-label="Mapa sem estabelecimentos">
          <div className="mapa__vazio">
            <Icone nome="mapa" tamanho={32} aria-hidden="true" />
            <p>Nenhum estabelecimento para exibir no mapa</p>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className={`mapa ${className}`} data-testid={testId} role="region" aria-label="Mapa de estabelecimentos">
        <MapContainer
          ref={mapContainerRef}
          center={centroInicial}
          zoom={zoomInicial}
          zoomControl={false}
          scrollWheelZoom={true}
          className="mapa__leaflet"
          aria-label="Mapa interativo de barbearias e salões"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapEvents />
        </MapContainer>

        <div className="mapa__controles">
          <button
            type="button"
            className="mapa__btn mapa__btn--centralizar"
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.setView(centroInicial, zoomInicial);
              }
            }}
            aria-label="Centralizar mapa em Belo Horizonte"
            data-testid="mapa-btn-centralizar"
          >
            <Icone nome="localizacao" tamanho={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mapa__btn mapa__btn--minha-localizacao"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    if (mapRef.current) {
                      mapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 14);
                    }
                  },
                  () => {
                    // Silencioso - usuário negou ou erro
                  },
                  { enableHighAccuracy: true, timeout: 10000 }
                );
              }
            }}
            aria-label="Ir para minha localização"
            data-testid="mapa-btn-minha-localizacao"
          >
            <Icone nome="gps" tamanho={20} aria-hidden="true" />
          </button>
        </div>

        <div className="mapa__legenda" aria-hidden="true">
          <span className="mapa__legenda-item">
            <span className="mapa__legenda-icone" style={{ background: '#e11d48' }} />
            <span>Barbearia</span>
          </span>
          <span className="mapa__legenda-item">
            <span className="mapa__legenda-icone" style={{ background: '#ec4899' }} />
            <span>Salão Feminino</span>
          </span>
          <span className="mapa__legenda-item">
            <span className="mapa__legenda-icone" style={{ background: '#a855f7' }} />
            <span>Visagismo</span>
          </span>
          <span className="mapa__legenda-item">
            <span className="mapa__legenda-icone" style={{ background: '#22c55e' }} />
            <span>Infantil</span>
          </span>
        </div>
      </div>
    );
  }
);

Mapa.displayName = 'Mapa';

export { Mapa };