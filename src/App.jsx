import { lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Salvo la portada y lo que hace falta para pintar cualquier página, cada pantalla se baja
// cuando se entra en ella: el panel de administración no pesa en la portada.

// Utilidades y layout
import ScrollToTop from "./ScrollToTop";
import AppLayout from "./AppLayout";
import AccesoCompra, { AccesoCompraTaller } from "./AccesoCompra";
import RutaTaller from "./RutaTaller";
import RutaCategoria from "./RutaCategoria";

// Páginas principales
import Portada from "./Portada.jsx";
const Login = lazy(() => import("./Login.jsx"));
const Registro = lazy(() => import("./Registro.jsx"));
const AccionCuenta = lazy(() => import("./AccionCuenta.jsx"));
const PerfilUsuario = lazy(() => import("./PerfilUsuario.jsx"));
const EditarPerfil = lazy(() => import("./EditarPerfil.jsx"));


// Legales y políticas
const PoliticaPiezas = lazy(() => import("./PoliticaPiezas"));
const RecogerPieza = lazy(() => import("./RecogerPieza"));
const AvisoLegal = lazy(() => import("./AvisoLegal.jsx"));
const PoliticaCancelacion = lazy(() => import("./PoliticaCancelacion.jsx"));
const CondicionesUso = lazy(() => import("./CondicionesUso.jsx"));
const PoliticaPrivacidad = lazy(() => import("./PoliticaPrivacidad.jsx"));
const CondicionesPago = lazy(() => import("./CondicionesPago.jsx"));

// Pagos
const ResumenPago = lazy(() => import("./ResumenPago.jsx"));
const ConfirmacionPago = lazy(() => import("./ConfirmacionPago.jsx"));
const PagoFallido = lazy(() => import("./PagoFallido.jsx"));
import NoEncontrada from "./NoEncontrada.jsx";
const GestionarReserva = lazy(() => import("./GestionarReserva"));

// Clases y secciones principales
const Clases = lazy(() => import("./Clases.jsx"));
const TalleresCrearPiezas = lazy(() => import("./TalleresCrearPiezas"));
const TalleresCursosBonos = lazy(() => import("./TalleresCursosBonos"));
const TalleresPintaDecora = lazy(() => import("./TalleresPintaDecora"));
const TalleresOtros = lazy(() => import("./TalleresOtros"));
const TalleresCategoria = lazy(() => import("./TalleresCategoria"));

// Talleres creados desde el panel admin
const TallerDinamico = lazy(() => import("./TallerDinamico"));
const ReservaTallerDinamico = lazy(() => import("./ReservaTallerDinamico"));
import RedirigirAFicha from "./RedirigirAFicha";

// Clases
const CreaTuBrunchBowl = lazy(() => import("./CreaTuBrunchBowl.jsx"));
const CreaTuPiezaFavorita = lazy(() => import("./CreaTuPiezaFavorita"));
const CreaTuCuencoRamen = lazy(() => import("./CreaTuCuencoRamen.jsx"));
const CreaTuBandejaHogar = lazy(() => import("./CreaTuBandejaHogar.jsx"));
const CreaTuTazaFavorita = lazy(() => import("./CreaTuTazaFavorita.jsx"));
const CreaTuMaceta = lazy(() => import("./CreaTuMaceta.jsx"));
const CreaTuGranCentroMesa = lazy(() => import("./CreaTuGranCentroMesa.jsx"));
const CreaTuJarraJarronGrande = lazy(() => import("./CreaTuJarraJarronGrande.jsx"));
const CreaTuSetMatcha = lazy(() => import("./CreaTuSetMatcha.jsx"));
const CreaTuSetSake = lazy(() => import("./CreaTuSetSake.jsx"));
const CreaTuTazaEscultorica = lazy(() => import("./CreaTuTazaEscultorica"));
const CreaTuMacetaOrganica = lazy(() => import("./CreaTuMacetaOrganica"));
const ModelaAManoYDecoraTusPiezasFavoritas = lazy(() => import("./ModelaAManoYDecoraTusPiezasFavoritas"));
const TornoAlfareroYDecoracion = lazy(() => import("./TornoAlfareroYDecoracion"));
const TornoAlfareroEmpezarDesdeCero = lazy(() => import("./TornoAlfareroEmpezarDesdeCero"));
const TornoAlfareroPerfeccionaLoQueYaSabes = lazy(() => import("./TornoAlfareroPerfeccionaLoQueYaSabes"));
const EspecialPintaTuPieza = lazy(() => import("./EspecialPintaTuPieza"));
const PintaTuPieza = lazy(() => import("./PintaTuPieza"));
const ComprarTarjetaRegalo = lazy(() => import("./ComprarTarjetaRegalo"));
const DescargarTarjetaRegalo = lazy(() => import("./DescargarTarjetaRegalo"));
const ClaseSueltaContinuidad = lazy(() => import("./ClaseSueltaContinuidad"));


// Reservas normales
const ReservaCreaTuPiezaFavorita = lazy(() => import("./ReservaCreaTuPiezaFavorita.jsx"));
const ReservaCreaTuBrunchBowl = lazy(() => import("./ReservaCreaTuBrunchBowl.jsx"));
const ReservaCreaTuCuencoRamen = lazy(() => import("./ReservaCreaTuCuencoRamen.jsx"));
const ReservaCreaTuBandejaHogar = lazy(() => import("./ReservaCreaTuBandejaHogar.jsx"));
const ReservaCreaTuTazaFavorita = lazy(() => import("./ReservaCreaTuTazaFavorita.jsx"));
const ReservaCreaTuMaceta = lazy(() => import("./ReservaCreaTuMaceta.jsx"));
const ReservaCreaTuGranCentroMesa = lazy(() => import("./ReservaCreaTuGranCentroMesa.jsx"));
const ReservaCreaTuJarraJarronGrande = lazy(() => import("./ReservaCreaTuJarraJarronGrande.jsx"));
const ReservaCreaTuSetMatcha = lazy(() => import("./ReservaCreaTuSetMatcha.jsx"));
const ReservaCreaTuSetSake = lazy(() => import("./ReservaCreaTuSetSake.jsx"));
const ReservaCreaTuTazaEscultorica = lazy(() => import("./ReservaCreaTuTazaEscultorica.jsx"));
const ReservaCreaTuMacetaOrganica = lazy(() => import("./ReservaCreaTuMacetaOrganica.jsx"));
const ReservaModelaAManoYDecoraTusPiezasFavoritas = lazy(() => import("./ReservaModelaAManoYDecoraTusPiezasFavoritas"));
const ReservaTornoAlfareroYDecoracion = lazy(() => import("./ReservaTornoAlfareroYDecoracion"));
const ReservaTornoAlfareroEmpezarDesdeCero = lazy(() => import("./ReservaTornoAlfareroEmpezarDesdeCero"));
const ReservaTornoAlfareroPerfeccionaLoQueYaSabes = lazy(() => import("./ReservaTornoAlfareroPerfeccionaLoQueYaSabes"));
const ReservaEspecialPintaTuPieza = lazy(() => import("./ReservaEspecialPintaTuPieza"));
const ReservaPintaTuPieza = lazy(() => import("./ReservaPintaTuPieza"));
const ReservaClaseSueltaContinuidad = lazy(() => import("./ReservaClaseSueltaContinuidad"));
const ReservaGrupos = lazy(() => import("./ReservaGrupos.jsx"));
const RegalarTaller = lazy(() => import("./RegalarTaller.jsx"));
const PaginaGrupos = lazy(() => import("./PaginaGrupos.jsx"));
const AdminPaginasEspeciales = lazy(() => import("./AdminPaginasEspeciales.jsx"));
const UsarBono = lazy(() => import("./UsarBono"));
const ReprogramarReserva = lazy(() => import("./ReprogramarReserva"));
const ReservarSiguienteSesion = lazy(() => import("./ReservarSiguienteSesion"));

// Nuevo Admin
const AdminReservasNuevo = lazy(() => import("./AdminReservasNuevo"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const AdminClasesNuevo = lazy(() => import("./AdminClasesNuevo"));
const AdminUsuariosNuevo = lazy(() => import("./AdminUsuariosNuevo"));
const AdminCalendarioReservas = lazy(() => import("./AdminCalendarioReservas"));
const AdminHistorialNuevo = lazy(() => import("./AdminHistorialNuevo"));
const AdminDetalleReservaNuevo = lazy(() => import("./AdminDetalleReservaNuevo"));
const AdminDetalleUsuarioNuevo = lazy(() => import("./AdminDetalleUsuarioNuevo"));
const AdminDetalleClaseNuevo = lazy(() => import("./AdminDetalleClaseNuevo"));
import RutaAdmin from "./RutaAdmin";
const AdminTarjetasRegalo = lazy(() => import("./AdminTarjetasRegalo"));
const AdminReservasGrupos = lazy(() => import("./AdminReservasGrupos"));
const AdminDetalleTarjetaRegaloNuevo = lazy(() => import("./AdminDetalleTarjetaRegaloNuevo"));
const AdminBloqueosFechas = lazy(() => import("./AdminBloqueosFechas"));
const AdminBonosNuevo = lazy(() => import("./AdminBonosNuevo"));
const AdminDetalleBonoNuevo = lazy(() => import("./AdminDetalleBonoNuevo"));
const AdminHabilitarFechas = lazy(() => import("./AdminHabilitarFechas"));
const AdminTallerForm = lazy(() => import("./AdminTallerForm"));
const AdminMigrarTalleres = lazy(() => import("./AdminMigrarTalleres"));
const AdminCategorias = lazy(() => import("./AdminCategorias"));
const AdminEspacio = lazy(() => import("./AdminEspacio"));
const AdminOrdenarClases = lazy(() => import("./AdminOrdenarClases"));

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/portada" replace />} />

          <Route path="/portada" element={<Portada />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/auth/accion" element={<AccionCuenta />} />
          <Route path="/perfil" element={<PerfilUsuario />} />
          <Route path="/editar-perfil" element={<EditarPerfil />} />

          <Route path="/recoger-pieza" element={<RecogerPieza />} />
          <Route path="/politica-piezas" element={<PoliticaPiezas />} />
          <Route path="/aviso-legal" element={<AvisoLegal />} />
          <Route path="/politicacancelacion" element={<PoliticaCancelacion />} />
          <Route path="/gestionar-reserva" element={<GestionarReserva />} />
          <Route path="/condicionesuso" element={<CondicionesUso />} />
          <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
          <Route path="/condiciones-pago" element={<CondicionesPago />} />

          <Route path="/clases" element={<Clases />} />
          <Route path="/talleres/cursos-bonos" element={<RutaCategoria categoriaId="cursos_bonos"><TalleresCursosBonos /></RutaCategoria>} />
          <Route path="/talleres/crear-piezas" element={<RutaCategoria categoriaId="crear_piezas"><TalleresCrearPiezas /></RutaCategoria>} />
          <Route path="/talleres/pinta-decora" element={<RutaCategoria categoriaId="pinta_decora"><TalleresPintaDecora /></RutaCategoria>} />
          <Route path="/talleres/otros" element={<RutaCategoria categoriaId="otros"><TalleresOtros /></RutaCategoria>} />
          <Route path="/categoria/:categoriaId" element={<TalleresCategoria />} />
          <Route path="/tarjeta-regalo" element={<Navigate to="/regalar-taller" replace />} />
          <Route path="/taller/:claseId" element={<TallerDinamico />} />
          <Route
            path="/reservar/:claseId"
            element={<RedirigirAFicha><AccesoCompraTaller><ReservaTallerDinamico /></AccesoCompraTaller></RedirigirAFicha>}
          />

          {/* Clases */}
          
          <Route path="/crea-tu-brunch-bowl" element={<RutaTaller claseId="creatubrunchbowl"><CreaTuBrunchBowl /></RutaTaller>} />
          <Route path="/crea-tu-pieza-favorita-desde-cero" element={<RutaTaller claseId="creatupiezafavorita"><CreaTuPiezaFavorita /></RutaTaller>} />
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
          <Route path="/tarjeta-regalo-pdf/:id" element={<DescargarTarjetaRegalo />} />
          <Route path="/comprar-tarjeta-regalo" element={<ComprarTarjetaRegalo />} />
          <Route path="/reserva-con-tarjeta-regalo" element={<Navigate to="/gestionar-reserva?tab=tarjeta" replace />} />
          <Route
            path="/talleres/clase-suelta-continuidad"
            element={<RutaTaller claseId="clasesueltacontinuidad"><ClaseSueltaContinuidad /></RutaTaller>}
          />

          <Route path="/reprogramar/:tipo/:id" element={<AccesoCompra requiereCuenta><ReprogramarReserva /></AccesoCompra>} />
          <Route path="/usar-bono/:bonoId" element={<AccesoCompra requiereCuenta><UsarBono /></AccesoCompra>} />
          <Route
            path="/reservar-siguiente-sesion/:orderId"
            element={<AccesoCompra requiereCuenta><ReservarSiguienteSesion /></AccesoCompra>}
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
          <Route path="/regalar-taller" element={<RegalarTaller />} />
          <Route path="/grupos" element={<PaginaGrupos />} />
          <Route path="/reserva-grupos" element={<AccesoCompra permitirVisita><ReservaGrupos /></AccesoCompra>} />

          {/* Canjear tarjeta regalo vive en una pestaña de /gestionar-reserva */}
          <Route path="/canjear-tarjeta" element={<Navigate to="/gestionar-reserva?tab=tarjeta" replace />} />
          <Route path="/canjear-tarjeta-regalo" element={<Navigate to="/gestionar-reserva?tab=tarjeta" replace />} />
          

          <Route path="/resumen-pago" element={<AccesoCompra><ResumenPago /></AccesoCompra>} />
          <Route path="/pago-fallido" element={<PagoFallido />} />
          <Route path="/pago/exito" element={<ConfirmacionPago />} />
          <Route path="/pago/error" element={<PagoFallido />} />

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
            path="/admin-calendario-reservas"
            element={
              <RutaAdmin>
                <AdminCalendarioReservas />
              </RutaAdmin>
            }
          />
          {/* Dirección anterior del calendario: se mantiene para los marcadores */}
          <Route
            path="/admin-calendario-reservas-nuevo"
            element={<Navigate to="/admin-calendario-reservas" replace />}
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
            path="/admin-paginas-especiales"
            element={
              <RutaAdmin>
                <AdminPaginasEspeciales />
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

          <Route path="*" element={<NoEncontrada />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;