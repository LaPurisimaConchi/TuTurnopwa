import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Utilidades y layout
import ScrollToTop from "./ScrollToTop";
import AppLayout from "./AppLayout";
import AccesoCompra, { AccesoCompraTaller } from "./AccesoCompra";
import RutaTaller from "./RutaTaller";
import RutaCategoria from "./RutaCategoria";

// Páginas principales
import Portada from "./Portada.jsx";
import Login from "./Login.jsx";
import Registro from "./Registro.jsx";
import Menu from "./Menu.jsx";
import PerfilUsuario from "./PerfilUsuario.jsx";
import EditarPerfil from "./EditarPerfil.jsx";


// Legales y políticas
import PoliticaPiezas from "./PoliticaPiezas";
import AvisoLegal from "./AvisoLegal.jsx";
import PoliticaCancelacion from "./PoliticaCancelacion.jsx";
import CondicionesUso from "./CondicionesUso.jsx";
import PoliticaPrivacidad from "./PoliticaPrivacidad.jsx";
import CondicionesPago from "./CondicionesPago.jsx";

// Pagos
import ResumenPago from "./ResumenPago.jsx";
import ConfirmacionPago from "./ConfirmacionPago.jsx";
import PagoFallido from "./PagoFallido.jsx";
import GestionarReserva from "./GestionarReserva";
import ResumenPagoTheClub from "./ResumenPagoTheClub.jsx";
import ResumenPagoTearium from "./ResumenPagoTearium.jsx";

// Clases y secciones principales
import Clases from "./Clases.jsx";
import ClasesSoloVista from "./ClasesSoloVista.jsx";
import TalleresCrearPiezas from "./TalleresCrearPiezas";
import TalleresCursosBonos from "./TalleresCursosBonos";
import TalleresPintaDecora from "./TalleresPintaDecora";
import TarjetaRegalo from "./TarjetaRegalo";
import TalleresOtros from "./TalleresOtros";
import TalleresCategoria from "./TalleresCategoria";

// Talleres creados desde el panel admin
import TallerDinamico from "./TallerDinamico";
import ReservaTallerDinamico from "./ReservaTallerDinamico";

// Clases
import CreaTuBrunchBowl from "./CreaTuBrunchBowl.jsx";
import CreaTuPiezaFavorita from "./CreaTuPiezaFavorita";
import PintarCeramica from "./PintarCeramica.jsx";
import CreaTuCuencoRamen from "./CreaTuCuencoRamen.jsx";
import CreaTuBandejaHogar from "./CreaTuBandejaHogar.jsx";
import CreaTuTazaFavorita from "./CreaTuTazaFavorita.jsx";
import CreaTuMaceta from "./CreaTuMaceta.jsx";
import CreaTuGranCentroMesa from "./CreaTuGranCentroMesa.jsx";
import CreaTuJarraJarronGrande from "./CreaTuJarraJarronGrande.jsx";
import CreaTuSetMatcha from "./CreaTuSetMatcha.jsx";
import CreaTuSetSake from "./CreaTuSetSake.jsx";
import CreaTuTazaEscultorica from "./CreaTuTazaEscultorica";
import CreaTuMacetaOrganica from "./CreaTuMacetaOrganica";
import ModelaAManoYDecoraTusPiezasFavoritas from "./ModelaAManoYDecoraTusPiezasFavoritas";
import TornoAlfareroYDecoracion from "./TornoAlfareroYDecoracion";
import TornoAlfareroEmpezarDesdeCero from "./TornoAlfareroEmpezarDesdeCero";
import TornoAlfareroPerfeccionaLoQueYaSabes from "./TornoAlfareroPerfeccionaLoQueYaSabes";
import EspecialPintaTuPieza from "./EspecialPintaTuPieza";
import PintaTuPieza from "./PintaTuPieza";
import ComprarTarjetaRegalo from "./ComprarTarjetaRegalo";
import GenerarCodigoTarjetaRegalo from "./GenerarCodigoTarjetaRegalo";
import ReservaConTarjetaRegalo from "./ReservaConTarjetaRegalo";
import ClaseSueltaContinuidad from "./ClaseSueltaContinuidad";
import CreaTuPiezaFavoritaRegalo from "./CreaTuPiezaFavoritaRegalo.jsx";


// Reservas normales
import ReservaCreaTuPiezaFavorita from "./ReservaCreaTuPiezaFavorita.jsx";
import ReservaCreaTuBrunchBowl from "./ReservaCreaTuBrunchBowl.jsx";
import ReservaCreaTuCuencoRamen from "./ReservaCreaTuCuencoRamen.jsx";
import ReservaCreaTuBandejaHogar from "./ReservaCreaTuBandejaHogar.jsx";
import ReservaCreaTuTazaFavorita from "./ReservaCreaTuTazaFavorita.jsx";
import ReservaCreaTuMaceta from "./ReservaCreaTuMaceta.jsx";
import ReservaCreaTuGranCentroMesa from "./ReservaCreaTuGranCentroMesa.jsx";
import ReservaCreaTuJarraJarronGrande from "./ReservaCreaTuJarraJarronGrande.jsx";
import ReservaCreaTuSetMatcha from "./ReservaCreaTuSetMatcha.jsx";
import ReservaCreaTuSetSake from "./ReservaCreaTuSetSake.jsx";
import ReservaCreaTuTazaEscultorica from "./ReservaCreaTuTazaEscultorica.jsx";
import ReservaCreaTuMacetaOrganica from "./ReservaCreaTuMacetaOrganica.jsx";
import ReservaModelaAManoYDecoraTusPiezasFavoritas from "./ReservaModelaAManoYDecoraTusPiezasFavoritas";
import ReservaTornoAlfareroYDecoracion from "./ReservaTornoAlfareroYDecoracion";
import ReservaTornoAlfareroEmpezarDesdeCero from "./ReservaTornoAlfareroEmpezarDesdeCero";
import ReservaTornoAlfareroPerfeccionaLoQueYaSabes from "./ReservaTornoAlfareroPerfeccionaLoQueYaSabes";
import ReservaEspecialPintaTuPieza from "./ReservaEspecialPintaTuPieza";
import ReservaPintaTuPieza from "./ReservaPintaTuPieza";
import ReservaClaseSueltaContinuidad from "./ReservaClaseSueltaContinuidad";
import ReservaGrupos from "./ReservaGrupos.jsx";
import UsarBonoTornoAlfareroEmpezarDesdeCero from "./UsarBonoTornoAlfareroEmpezarDesdeCero";
import UsarBono from "./UsarBono";


// Tarjetas regalo
import CanjearTarjetaRegalo from "./CanjearTarjetaRegalo";

// Ubicaciones externas
import TheClub from "./TheClub.jsx";
import TeariumInfo from "./TeariumInfo.jsx";
import ReservaTheClub from "./ReservaTheClub.jsx";
import ReservaTearium from "./ReservaTearium.jsx";

// Clases online
import ClasesOnlineInfo from "./ClasesOnlineInfo.jsx";
import ReservaClasesOnline from "./ReservaClasesOnline.jsx";

// Nuevo Admin
import AdminNuevo from "./AdminNuevo";
import AdminReservasNuevo from "./AdminReservasNuevo";
import AdminDashboard from "./AdminDashboard";
import AdminClasesNuevo from "./AdminClasesNuevo";
import AdminUsuariosNuevo from "./AdminUsuariosNuevo";
import AdminCalendarioReservasNuevo from "./AdminCalendarioReservasNuevo";
import AdminHistorialNuevo from "./AdminHistorialNuevo";
import AdminDetalleReservaNuevo from "./AdminDetalleReservaNuevo";
import AdminDetalleUsuarioNuevo from "./AdminDetalleUsuarioNuevo";
import AdminDetalleClaseNuevo from "./AdminDetalleClaseNuevo";
import RutaAdmin from "./RutaAdmin";
import AdminTarjetasRegalo from "./AdminTarjetasRegalo";
import AdminReservasGrupos from "./AdminReservasGrupos";
import AdminDetalleTarjetaRegaloNuevo from "./AdminDetalleTarjetaRegaloNuevo";
import AdminBloqueosFechas from "./AdminBloqueosFechas";
import AdminBonosNuevo from "./AdminBonosNuevo";
import AdminDetalleBonoNuevo from "./AdminDetalleBonoNuevo";
import AdminHabilitarFechas from "./AdminHabilitarFechas";
import AdminTallerForm from "./AdminTallerForm";
import AdminMigrarTalleres from "./AdminMigrarTalleres";
import AdminCategorias from "./AdminCategorias";
import AdminEspacio from "./AdminEspacio";
import AdminOrdenarClases from "./AdminOrdenarClases";

import DondeReservarV2 from "./DondeReservarV2.jsx";
import ChatAyuda from "./ChatAyuda.jsx";

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/portada" replace />} />
          <Route path="/ayuda" element={<ChatAyuda />} />

          <Route path="/portada" element={<Portada />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/perfil" element={<PerfilUsuario />} />
          <Route path="/editar-perfil" element={<EditarPerfil />} />
          <Route path="/dondereservar" element={<DondeReservarV2 />} />

          <Route path="/politica-piezas" element={<PoliticaPiezas />} />
          <Route path="/aviso-legal" element={<AvisoLegal />} />
          <Route path="/politicacancelacion" element={<PoliticaCancelacion />} />
          <Route path="/gestionar-reserva" element={<GestionarReserva />} />
          <Route path="/condicionesuso" element={<CondicionesUso />} />
          <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
          <Route path="/condiciones-pago" element={<CondicionesPago />} />

          <Route path="/clases" element={<Clases />} />
          <Route path="/clases-solo" element={<ClasesSoloVista />} />
          <Route path="/talleres/cursos-bonos" element={<RutaCategoria categoriaId="cursos_bonos"><TalleresCursosBonos /></RutaCategoria>} />
          <Route path="/talleres/crear-piezas" element={<RutaCategoria categoriaId="crear_piezas"><TalleresCrearPiezas /></RutaCategoria>} />
          <Route path="/talleres/pinta-decora" element={<RutaCategoria categoriaId="pinta_decora"><TalleresPintaDecora /></RutaCategoria>} />
          <Route path="/talleres/otros" element={<RutaCategoria categoriaId="otros"><TalleresOtros /></RutaCategoria>} />
          <Route path="/categoria/:categoriaId" element={<TalleresCategoria />} />
          <Route path="/tarjeta-regalo" element={<TarjetaRegalo />} />
          <Route path="/taller/:claseId" element={<TallerDinamico />} />
          <Route
            path="/reservar/:claseId"
            element={<AccesoCompraTaller><ReservaTallerDinamico /></AccesoCompraTaller>}
          />

          {/* Clases */}
          
          <Route path="/crea-tu-brunch-bowl" element={<RutaTaller claseId="creatubrunchbowl"><CreaTuBrunchBowl /></RutaTaller>} />
          <Route path="/crea-tu-pieza-favorita-desde-cero" element={<RutaTaller claseId="creatupiezafavorita"><CreaTuPiezaFavorita /></RutaTaller>} />
          <Route path="/pintar-ceramica" element={<PintarCeramica />} />
          <Route path="/crea-tu-cuenco-ramen" element={<RutaTaller claseId="creatucuencoramen"><CreaTuCuencoRamen /></RutaTaller>} />
          <Route path="/crea-tu-bandeja-hogar" element={<RutaTaller claseId="creatubandejahogar"><CreaTuBandejaHogar /></RutaTaller>} />
          <Route path="/crea-tu-taza-favorita" element={<RutaTaller claseId="creatutazafavorita"><CreaTuTazaFavorita /></RutaTaller>} />
          <Route path="/crea-tu-maceta" element={<RutaTaller claseId="creatumaceta"><CreaTuMaceta /></RutaTaller>} />
          <Route path="/crea-tu-gran-centro-mesa" element={<RutaTaller claseId="creatugrancentrodemesa"><CreaTuGranCentroMesa /></RutaTaller>} />
          <Route path="/crea-tu-jarra-jarron-grande" element={<RutaTaller claseId="creatujarrajarrongrande"><CreaTuJarraJarronGrande /></RutaTaller>} />
          <Route path="/crea-tu-set-matcha" element={<RutaTaller claseId="setmatcha"><CreaTuSetMatcha /></RutaTaller>} />
          <Route path="/crea-tu-set-sake" element={<RutaTaller claseId="setsake"><CreaTuSetSake /></RutaTaller>} />
          <Route path="/crea-tu-taza-escultorica" element={<RutaTaller claseId="tazaescultorica"><CreaTuTazaEscultorica /></RutaTaller>} />
          <Route path="/crea-tu-maceta-organica" element={<RutaTaller claseId="macetaorganica"><CreaTuMacetaOrganica /></RutaTaller>} />
          <Route
            path="/modela-a-mano-y-decora-tus-piezas-favoritas"
            element={<RutaTaller claseId="modelamano4clases"><ModelaAManoYDecoraTusPiezasFavoritas /></RutaTaller>}
          />
          <Route path="/torno-alfarero-y-decoracion" element={<RutaTaller claseId="tornodecoracion4clases"><TornoAlfareroYDecoracion /></RutaTaller>} />
          <Route
            path="/torno-alfarero-empezar-desde-cero"
            element={<RutaTaller claseId="tornodesdecero4clases"><TornoAlfareroEmpezarDesdeCero /></RutaTaller>}
          />
          <Route
            path="/torno-alfarero-perfecciona-lo-que-ya-sabes"
            element={<RutaTaller claseId="tornoperfeccionamiento6clases"><TornoAlfareroPerfeccionaLoQueYaSabes /></RutaTaller>}
          />
          <Route path="/especial-pinta-tu-pieza" element={<RutaTaller claseId="especialpintatupieza"><EspecialPintaTuPieza /></RutaTaller>} />
          <Route path="/pinta-tu-pieza" element={<RutaTaller claseId="pintatupieza"><PintaTuPieza /></RutaTaller>} />
          <Route path="/comprar-tarjeta-regalo" element={<ComprarTarjetaRegalo />} />
          <Route
            path="/generar-codigo-tarjeta-regalo"
            element={<GenerarCodigoTarjetaRegalo />}
          />
          <Route path="/reserva-con-tarjeta-regalo" element={<AccesoCompra><ReservaConTarjetaRegalo /></AccesoCompra>} />
          <Route
            path="/talleres/clase-suelta-continuidad"
            element={<RutaTaller claseId="clasesueltacontinuidad"><ClaseSueltaContinuidad /></RutaTaller>}
          />

          <Route path="/usar-bono/:bonoId" element={<AccesoCompra requiereCuenta><UsarBono /></AccesoCompra>} />
          <Route
            path="/usar-bono-torno-alfarero-empezar-desde-cero"
            element={<AccesoCompra requiereCuenta><UsarBonoTornoAlfareroEmpezarDesdeCero /></AccesoCompra>}
          />
          <Route
            path="/reserva-crea-tu-pieza-favorita"
            element={<RutaTaller claseId="creatupiezafavorita" tipo="reserva"><AccesoCompra><ReservaCreaTuPiezaFavorita /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-crea-tu-brunch-bowl"
            element={<RutaTaller claseId="creatubrunchbowl" tipo="reserva"><AccesoCompra><ReservaCreaTuBrunchBowl /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-crea-tu-cuenco-ramen"
            element={<RutaTaller claseId="creatucuencoramen" tipo="reserva"><AccesoCompra><ReservaCreaTuCuencoRamen /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-crea-tu-bandeja-hogar"
            element={<RutaTaller claseId="creatubandejahogar" tipo="reserva"><AccesoCompra><ReservaCreaTuBandejaHogar /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-crea-tu-taza-favorita"
            element={<RutaTaller claseId="creatutazafavorita" tipo="reserva"><AccesoCompra><ReservaCreaTuTazaFavorita /></AccesoCompra></RutaTaller>}
          />
          <Route path="/reserva-crea-tu-maceta" element={<RutaTaller claseId="creatumaceta" tipo="reserva"><AccesoCompra><ReservaCreaTuMaceta /></AccesoCompra></RutaTaller>} />
          <Route
            path="/reserva-crea-tu-gran-centro-mesa"
            element={<RutaTaller claseId="creatugrancentrodemesa" tipo="reserva"><AccesoCompra><ReservaCreaTuGranCentroMesa /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-crea-tu-jarra-jarron-grande"
            element={<RutaTaller claseId="creatujarrajarrongrande" tipo="reserva"><AccesoCompra><ReservaCreaTuJarraJarronGrande /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-crea-tu-set-matcha"
            element={<RutaTaller claseId="setmatcha" tipo="reserva"><AccesoCompra><ReservaCreaTuSetMatcha /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-crea-tu-set-sake"
            element={<RutaTaller claseId="setsake" tipo="reserva"><AccesoCompra><ReservaCreaTuSetSake /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-crea-tu-taza-escultorica"
            element={<RutaTaller claseId="tazaescultorica" tipo="reserva"><AccesoCompra><ReservaCreaTuTazaEscultorica /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-crea-tu-maceta-organica"
            element={<RutaTaller claseId="macetaorganica" tipo="reserva"><AccesoCompra><ReservaCreaTuMacetaOrganica /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-modela-a-mano-y-decora-tus-piezas-favoritas"
            element={<RutaTaller claseId="modelamano4clases" tipo="reserva"><AccesoCompra requiereCuenta><ReservaModelaAManoYDecoraTusPiezasFavoritas /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-torno-alfarero-y-decoracion"
            element={<RutaTaller claseId="tornodecoracion4clases" tipo="reserva"><AccesoCompra requiereCuenta><ReservaTornoAlfareroYDecoracion /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-torno-alfarero-empezar-desde-cero"
            element={<RutaTaller claseId="tornodesdecero4clases" tipo="reserva"><AccesoCompra requiereCuenta><ReservaTornoAlfareroEmpezarDesdeCero /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-torno-alfarero-perfecciona-lo-que-ya-sabes"
            element={<RutaTaller claseId="tornoperfeccionamiento6clases" tipo="reserva"><AccesoCompra requiereCuenta><ReservaTornoAlfareroPerfeccionaLoQueYaSabes /></AccesoCompra></RutaTaller>}
          />
          <Route
            path="/reserva-especial-pinta-tu-pieza"
            element={<RutaTaller claseId="especialpintatupieza" tipo="reserva"><AccesoCompra><ReservaEspecialPintaTuPieza /></AccesoCompra></RutaTaller>}
          />
          <Route path="/reserva-pinta-tu-pieza" element={<RutaTaller claseId="pintatupieza" tipo="reserva"><AccesoCompra><ReservaPintaTuPieza /></AccesoCompra></RutaTaller>} />
          <Route
            path="/reserva-clase-suelta-continuidad"
            element={<RutaTaller claseId="clasesueltacontinuidad" tipo="reserva"><AccesoCompra><ReservaClaseSueltaContinuidad /></AccesoCompra></RutaTaller>}
          />
          <Route path="/reserva-grupos" element={<AccesoCompra permitirVisita><ReservaGrupos /></AccesoCompra>} />

          <Route
            path="/tarjeta-regalo-solo/creapiezafavorita"
            element={<CreaTuPiezaFavoritaRegalo />}
          />
          <Route
            path="/creapiezafavorita-solo"
            element={<CreaTuPiezaFavoritaRegalo />}
          />
          <Route path="/canjear-tarjeta" element={<AccesoCompra><CanjearTarjetaRegalo /></AccesoCompra>} />
          <Route
            path="/canjear-tarjeta-regalo"
            element={<AccesoCompra><CanjearTarjetaRegalo /></AccesoCompra>}
          />
          

          <Route path="/resumen-pago" element={<AccesoCompra><ResumenPago /></AccesoCompra>} />
          <Route path="/resumenpagotheclub" element={<AccesoCompra><ResumenPagoTheClub /></AccesoCompra>} />
          <Route path="/resumenpagotearium" element={<AccesoCompra><ResumenPagoTearium /></AccesoCompra>} />
          <Route path="/pago-fallido" element={<PagoFallido />} />
          <Route path="/pago/exito" element={<ConfirmacionPago />} />
          <Route path="/pago/error" element={<PagoFallido />} />
          <Route path="/theclub" element={<TheClub />} />
          <Route path="/teariumInfo" element={<TeariumInfo />} />
          <Route path="/reservatheclub" element={<AccesoCompra><ReservaTheClub /></AccesoCompra>} />
          <Route path="/reservatearium" element={<AccesoCompra><ReservaTearium /></AccesoCompra>} />

          <Route path="/clases-online" element={<ClasesOnlineInfo />} />
          <Route path="/reserva-online" element={<AccesoCompra><ReservaClasesOnline /></AccesoCompra>} />

          <Route
            path="/admin-detalle-bono"
            element={
              <RutaAdmin>
                <AdminDetalleBonoNuevo />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-reservas-grupos"
            element={
              <RutaAdmin>
                <AdminReservasGrupos />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-nuevo"
            element={
              <RutaAdmin>
                <AdminNuevo />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-reservas-nuevo"
            element={
              <RutaAdmin>
                <AdminReservasNuevo />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <RutaAdmin>
                <AdminDashboard />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-clases"
            element={
              <RutaAdmin>
                <AdminClasesNuevo />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-ordenar-clases"
            element={
              <RutaAdmin>
                <AdminOrdenarClases />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-usuarios-nuevo"
            element={
              <RutaAdmin>
                <AdminUsuariosNuevo />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-calendario-reservas-nuevo"
            element={
              <RutaAdmin>
                <AdminCalendarioReservasNuevo />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-historial-nuevo"
            element={
              <RutaAdmin>
                <AdminHistorialNuevo />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-detalle-reserva"
            element={
              <RutaAdmin>
                <AdminDetalleReservaNuevo />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-detalle-usuario"
            element={
              <RutaAdmin>
                <AdminDetalleUsuarioNuevo />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-detalle-clase"
            element={
              <RutaAdmin>
                <AdminDetalleClaseNuevo />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-detalle-tarjeta-regalo"
            element={
              <RutaAdmin>
                <AdminDetalleTarjetaRegaloNuevo />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-bloqueos-fechas"
            element={
              <RutaAdmin>
                <AdminBloqueosFechas />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-habilitar-fechas"
            element={
              <RutaAdmin>
                <AdminHabilitarFechas />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-espacio"
            element={
              <RutaAdmin>
                <AdminEspacio />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-bonos-nuevo"
            element={
              <RutaAdmin>
                <AdminBonosNuevo />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-migrar-talleres"
            element={
              <RutaAdmin>
                <AdminMigrarTalleres />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-categorias"
            element={
              <RutaAdmin>
                <AdminCategorias />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-taller"
            element={
              <RutaAdmin>
                <AdminTallerForm />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin-tarjetas-regalo"
            element={
              <RutaAdmin>
                <AdminTarjetasRegalo />
              </RutaAdmin>
            }
          />

          <Route path="*" element={<Navigate to="/portada" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;