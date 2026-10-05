import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export interface InvoicePdfLine {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  irpfPct: number;
  ivaPct: number;
  paymentMethod: string;
  lines: InvoicePdfLine[];
  issuer: {
    name: string | null;
    taxId: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    iban: string | null;
  };
  client: {
    name: string;
    taxId: string | null;
    address: string | null;
    email: string | null;
  };
  /** Data URI; absent when no logo is configured or it is an SVG. */
  logo?: string;
}

// react-pdf renders with its own layout engine, not the browser's: no
// Tailwind, no CSS variables, and only the subset of flexbox it implements.
const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 48,
    paddingVertical: 44,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { height: 46, maxWidth: 160, objectFit: "contain" },
  issuerName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  muted: { color: "#6b7280" },
  parties: { flexDirection: "row", gap: 24, marginTop: 32 },
  party: { flex: 1, gap: 2 },
  partyLabel: {
    fontSize: 7.5,
    letterSpacing: 1,
    color: "#6b7280",
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  partyName: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 32 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    paddingBottom: 5,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  colDescription: { flex: 1 },
  colQty: { width: 52, textAlign: "right" },
  colPrice: { width: 78, textAlign: "right" },
  colTotal: { width: 82, textAlign: "right" },
  headCell: { fontSize: 7.5, letterSpacing: 0.6, fontFamily: "Helvetica-Bold", color: "#6b7280" },
  totals: { marginTop: 18, marginLeft: "auto", width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#111827",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  payment: { marginTop: 38, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: "#e5e7eb", gap: 2 },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 48,
    right: 48,
    textAlign: "center",
    fontSize: 7.5,
    color: "#9ca3af",
  },
});

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const date = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

function formatDate(iso: string) {
  return date.format(new Date(`${iso}T00:00:00`));
}

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const base = data.lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
  const iva = (base * data.ivaPct) / 100;
  const irpf = (base * data.irpfPct) / 100;
  const total = base + iva - irpf;

  return (
    <Document
      author={data.issuer.name ?? undefined}
      title={`Factura ${data.invoiceNumber}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {/* react-pdf's Image is a PDF primitive, not an <img>: it takes no alt. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {data.logo ? <Image src={data.logo} style={styles.logo} /> : null}
            {data.issuer.name ? (
              <Text style={[styles.issuerName, data.logo ? { marginTop: 8 } : {}]}>
                {data.issuer.name}
              </Text>
            ) : null}
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>FACTURA</Text>
            <Text style={{ marginTop: 4 }}>N.º {data.invoiceNumber}</Text>
            <Text style={styles.muted}>Emisión: {formatDate(data.issueDate)}</Text>
            {data.dueDate ? (
              <Text style={styles.muted}>Vencimiento: {formatDate(data.dueDate)}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>EMISOR</Text>
            {data.issuer.name ? <Text style={styles.partyName}>{data.issuer.name}</Text> : null}
            {data.issuer.taxId ? <Text>NIF: {data.issuer.taxId}</Text> : null}
            {data.issuer.address ? <Text>{data.issuer.address}</Text> : null}
            {data.issuer.email ? <Text>{data.issuer.email}</Text> : null}
            {data.issuer.phone ? <Text>{data.issuer.phone}</Text> : null}
          </View>

          <View style={styles.party}>
            <Text style={styles.partyLabel}>CLIENTE</Text>
            <Text style={styles.partyName}>{data.client.name}</Text>
            {data.client.taxId ? <Text>CIF/NIF: {data.client.taxId}</Text> : null}
            {data.client.address ? <Text>{data.client.address}</Text> : null}
            {data.client.email ? <Text>{data.client.email}</Text> : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.colDescription, styles.headCell]}>CONCEPTO</Text>
            <Text style={[styles.colQty, styles.headCell]}>CANT.</Text>
            <Text style={[styles.colPrice, styles.headCell]}>PRECIO</Text>
            <Text style={[styles.colTotal, styles.headCell]}>IMPORTE</Text>
          </View>

          {data.lines.map((line, index) => (
            <View key={index} style={styles.row} wrap={false}>
              <Text style={styles.colDescription}>{line.description}</Text>
              <Text style={styles.colQty}>{line.quantity}</Text>
              <Text style={styles.colPrice}>{euro.format(line.unit_price)}</Text>
              <Text style={styles.colTotal}>{euro.format(line.quantity * line.unit_price)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>Base imponible</Text>
            <Text>{euro.format(base)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>IVA ({data.ivaPct}%)</Text>
            <Text>{euro.format(iva)}</Text>
          </View>
          {data.irpfPct > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.muted}>Retención IRPF ({data.irpfPct}%)</Text>
              <Text>-{euro.format(irpf)}</Text>
            </View>
          ) : null}
          <View style={styles.grandTotal}>
            <Text>TOTAL</Text>
            <Text>{euro.format(total)}</Text>
          </View>
        </View>

        <View style={styles.payment}>
          <Text style={styles.partyLabel}>FORMA DE COBRO</Text>
          <Text>{data.paymentMethod}</Text>
          {data.issuer.iban ? <Text>IBAN: {data.issuer.iban}</Text> : null}
        </View>

        <Text fixed style={styles.footer}>
          Factura {data.invoiceNumber} · {data.issuer.name ?? ""}
        </Text>
      </Page>
    </Document>
  );
}
