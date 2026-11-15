import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CryptoJS from "crypto-js";

const RedirigiendoPago = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const datos = location.state;

  useEffect(() => {
    if (!datos || !datos.tipo || !datos.clase || !datos.precio) {
      console.error("Faltan datos para el pago.");
      navigate("/");
      return;
    }

    const claveSecreta = "Mk9m98IfEblmPfrpsawt7BmxObt98Jev"; // clave de pruebas

    const merchantData = {
      DS_MERCHANT_AMOUNT: `${datos.precio * 100}`,
      DS_MERCHANT_ORDER: "ORD" + new Date().getTime(),
      DS_MERCHANT_MERCHANTCODE: "999008881",
      DS_MERCHANT_CURRENCY: "978",
      DS_MERCHANT_TRANSACTIONTYPE: "0",
      DS_MERCHANT_TERMINAL: "1",
      DS_MERCHANT_MERCHANTURL: "https://app.lapurisimaconchi.es/notificacion",
      DS_MERCHANT_URLOK: "https://app.lapurisimaconchi.es/generarcodigotarjetaregalo",
      DS_MERCHANT_URLKO: "https://app.lapurisimaconchi.es/pago-fallido",
      DS_MERCHANT_PRODUCTDESCRIPTION: datos.clase,
    };

    const paramsBase64 = btoa(JSON.stringify(merchantData));
    const clave = CryptoJS.enc.Base64.parse(claveSecreta);
    const orderKey = CryptoJS.HmacSHA256(merchantData.DS_MERCHANT_ORDER, clave).toString(CryptoJS.enc.Base64);
    const signature = CryptoJS.HmacSHA256(paramsBase64, CryptoJS.enc.Base64.parse(orderKey)).toString(CryptoJS.enc.Base64);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://sis-t.redsys.es:25443/sis/realizarPago";

    form.innerHTML = `
      <input type="hidden" name="Ds_SignatureVersion" value="HMAC_SHA256_V1" />
      <input type="hidden" name="Ds_MerchantParameters" value="${paramsBase64}" />
      <input type="hidden" name="Ds_Signature" value="${signature}" />
    `;

    document.body.appendChild(form);
    form.submit();
  }, [datos, navigate]);

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <h1 style={styles.title}>Redirigiendo al pago seguro...</h1>
        <p style={styles.text}>
          Estamos conectando con la pasarela de pago segura. Por favor, espera unos segundos...
        </p>
        <div style={styles.spinner}></div>
      </div>
    </div>
  );
};

const styles = {
  body: {
    backgroundColor: "#fdfaf5",
    fontFamily: "'Segoe UI', sans-serif",
    minHeight: "100vh",
    padding: "40px 20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#333",
  },
  container: {
    maxWidth: "400px",
    textAlign: "center",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "30px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  title: {
    fontSize: "1.4rem",
    marginBottom: "10px",
    color: "#3f3128",
  },
  text: {
    fontSize: "1rem",
    marginBottom: "30px",
  },
  spinner: {
    border: "6px solid #f3f3f3",
    borderTop: "6px solid #f59e8f",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    margin: "0 auto",
    animation: "spin 1s linear infinite"
  }
};

// Animación CSS
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

export default RedirigiendoPago;


