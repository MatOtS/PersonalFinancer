// The PDF of an issued invoice (work item 009). react-pdf renders with its own
// layout engine, not the browser's: no Tailwind, no CSS variables, and only the
// subset of flexbox it implements, so the styles are plain values here.
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  invoiceTotals,
  lineTotalCents,
  percentText,
  type ValidLine,
} from "@/domain/invoices";
import { formatCents } from "@/domain/money";

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  irpfBp: number;
  ivaBp: number;
  lines: ValidLine[];
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
  // Data URI; absent when no logo is configured or it is not png or jpg.
  logo?: string;
};

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 48,
    paddingVertical: 44,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
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
  headCell: {
    fontSize: 7.5,
    letterSpacing: 0.6,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
  },
  totals: { marginTop: 18, marginLeft: "auto", width: 230 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
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
  payment: {
    marginTop: 38,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    gap: 2,
  },
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

const formatDate = (iso: string) => iso.split("-").reverse().join("/");
const quantityText = (hundredths: number) => percentText(hundredths);

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const totals = invoiceTotals(data.lines, data.irpfBp, data.ivaBp);

  return (
    <Document
      author={data.issuer.name ?? undefined}
      title={`Factura ${data.invoiceNumber}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- a PDF image has no alt */}
            {data.logo ? <Image src={data.logo} style={styles.logo} /> : null}
            {data.issuer.name ? (
              <Text
                style={[styles.issuerName, data.logo ? { marginTop: 8 } : {}]}
              >
                {data.issuer.name}
              </Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>FACTURA</Text>
            <Text style={{ marginTop: 4 }}>N.º {data.invoiceNumber}</Text>
            <Text style={styles.muted}>
              Emisión: {formatDate(data.issueDate)}
            </Text>
            {data.dueDate ? (
              <Text style={styles.muted}>
                Vencimiento: {formatDate(data.dueDate)}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>EMISOR</Text>
            {data.issuer.name ? (
              <Text style={styles.partyName}>{data.issuer.name}</Text>
            ) : null}
            {data.issuer.taxId ? <Text>NIF: {data.issuer.taxId}</Text> : null}
            {data.issuer.address ? <Text>{data.issuer.address}</Text> : null}
            {data.issuer.email ? <Text>{data.issuer.email}</Text> : null}
            {data.issuer.phone ? <Text>{data.issuer.phone}</Text> : null}
          </View>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>CLIENTE</Text>
            <Text style={styles.partyName}>{data.client.name}</Text>
            {data.client.taxId ? (
              <Text>CIF/NIF: {data.client.taxId}</Text>
            ) : null}
            {data.client.address ? <Text>{data.client.address}</Text> : null}
            {data.client.email ? <Text>{data.client.email}</Text> : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.colDescription, styles.headCell]}>
              CONCEPTO
            </Text>
            <Text style={[styles.colQty, styles.headCell]}>CANT.</Text>
            <Text style={[styles.colPrice, styles.headCell]}>PRECIO</Text>
            <Text style={[styles.colTotal, styles.headCell]}>IMPORTE</Text>
          </View>
          {data.lines.map((line, index) => (
            <View key={index} style={styles.row} wrap={false}>
              <Text style={styles.colDescription}>{line.description}</Text>
              <Text style={styles.colQty}>
                {quantityText(line.quantityHundredths)}
              </Text>
              <Text style={styles.colPrice}>
                {formatCents(line.unitPriceCents)}
              </Text>
              <Text style={styles.colTotal}>
                {formatCents(lineTotalCents(line))}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>Base imponible</Text>
            <Text>{formatCents(totals.baseCents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>IVA ({percentText(data.ivaBp)}%)</Text>
            <Text>{formatCents(totals.ivaCents)}</Text>
          </View>
          {data.irpfBp > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.muted}>
                Retención IRPF ({percentText(data.irpfBp)}%)
              </Text>
              <Text>-{formatCents(totals.irpfCents)}</Text>
            </View>
          ) : null}
          <View style={styles.grandTotal}>
            <Text>TOTAL</Text>
            <Text>{formatCents(totals.totalCents)}</Text>
          </View>
        </View>

        {data.issuer.iban ? (
          <View style={styles.payment}>
            <Text style={styles.partyLabel}>FORMA DE COBRO</Text>
            <Text>IBAN: {data.issuer.iban}</Text>
          </View>
        ) : null}

        <Text fixed style={styles.footer}>
          Factura {data.invoiceNumber} · {data.issuer.name ?? ""}
        </Text>
      </Page>
    </Document>
  );
}
