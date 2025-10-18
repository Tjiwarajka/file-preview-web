import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Layout, Typography, Card, Form, Input, Button, Space, Alert, Row, Col, Divider, Image } from 'antd'
import { jsPDF } from 'jspdf'

const { Header, Content, Footer } = Layout
const { Title, Paragraph, Text } = Typography

function extFromName(name = '') {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

function inferTypeFromExtension(name) {
  const ext = extFromName(name)
  const map = {
    pdf: 'application/pdf',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
    txt: 'text/plain', md: 'text/markdown', json: 'application/json',
    html: 'text/html', css: 'text/css', js: 'text/javascript'
  }
  return map[ext] || ''
}

export default function App() {
  const [fetching, setFetching] = useState(false)
  const [info, setInfo] = useState('')
  const [urlForm] = Form.useForm()
  const fileInputRef = useRef(null)
  const objectUrlRef = useRef(null)

  const [preview, setPreview] = useState({
    kind: 'empty', // 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'download' | 'empty'
    url: '',
    type: '',
    text: '',
    filename: ''
  })

  const clearPreview = useCallback(() => {
    setInfo('')
    setPreview({ kind: 'empty', url: '', type: '', text: '', filename: '' })
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  const previewBlob = useCallback(async (blob, filename = 'file') => {
    clearPreview()
    const type = blob.type || inferTypeFromExtension(filename)

    if (!type) {
      try {
        const head = await blob.slice(0, 2048).text()
        const looksText = /[\x09\x0A\x0D\x20-\x7E]/.test(head)
        if (looksText) {
          const rest = blob.size > 2048 ? await blob.slice(2048).text() : ''
          setPreview({ kind: 'text', url: '', type: 'text/plain', text: head + rest, filename })
          return
        }
      } catch (_) {}
    }

    const url = URL.createObjectURL(blob)
    objectUrlRef.current = url

    try {
      if (type.startsWith('image/')) {
        setPreview({ kind: 'image', url, type, text: '', filename })
      } else if (type === 'application/pdf') {
        setPreview({ kind: 'pdf', url, type, text: '', filename })
      } else if (type.startsWith('video/')) {
        setPreview({ kind: 'video', url, type, text: '', filename })
      } else if (type.startsWith('audio/')) {
        setPreview({ kind: 'audio', url, type, text: '', filename })
      } else if (type.startsWith('text/') || ['application/json'].includes(type)) {
        const text = await blob.text()
        setPreview({ kind: 'text', url: '', type, text, filename })
      } else {
        setPreview({ kind: 'download', url, type, text: '', filename })
        setInfo('Preview not supported for this file type. Provided a direct download instead.')
      }
    } catch (err) {
      console.error(err)
      setInfo('Failed to render preview.')
    }
  }, [clearPreview])

  const onPreviewUrl = useCallback(async (values) => {
    const url = (values.fileUrl || '').trim()
    if (!url) return
    clearPreview()
    setFetching(true)
    setInfo('Fetching...')
    try {
      const res = await fetch(url, { mode: 'cors' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const filename = url.split('/').pop()?.split('?')[0] || 'download'
      await previewBlob(blob, filename)
      setInfo('')
    } catch (err) {
      console.error(err)
      setInfo('Unable to fetch due to CORS or network error. Try downloading the file and using local upload.')
    } finally {
      setFetching(false)
    }
  }, [clearPreview, previewBlob])

  const onLocalFile = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    await previewBlob(file, file.name)
  }, [previewBlob])

  const onDownloadPdf = useCallback(() => {
    const text = document.getElementById('pdfTextArea')?.value || ''
    const nameRaw = document.getElementById('pdfFilenameInput')?.value || 'text'
    const name = nameRaw.replace(/\s+/g, '_')
    if (!text.trim()) { setInfo('Please enter some text first.'); return }
    setInfo('Generating PDF...')
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const margin = 40
      const pageWidth = doc.internal.pageSize.getWidth()
      const maxWidth = pageWidth - margin * 2
      const lineHeight = 16

      const lines = doc.splitTextToSize(text, maxWidth)
      let y = margin
      lines.forEach((line) => {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage()
          y = margin
        }
        doc.text(line, margin, y)
        y += lineHeight
      })

      doc.save(`${name}.pdf`)
      setInfo('PDF downloaded.')
    } catch (err) {
      console.error(err)
      setInfo('Failed to generate PDF.')
    }
  }, [])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: 'transparent', height: 'auto', lineHeight: 'normal', padding: 0, marginBottom: 24 }}>
        <div className="app-hero">
          <Title level={1} className="app-title">Preview Studio</Title>
          <Text className="app-subtitle">Preview files from a URL or local upload, or turn text into a PDF — all in your browser.</Text>
        </div>
      </Header>
      <Content style={{ maxWidth: 'var(--maxw)', margin: '16px auto', width: '100%', padding: '0 16px' }}>
        <Space direction="vertical" size="large" style={{ display: 'flex' }}>
          <Card title="Preview from URL">
            <Form form={urlForm} layout="vertical" onFinish={onPreviewUrl}>
              <Row gutter={12}>
                <Col xs={24} md={18}>
                  <Form.Item name="fileUrl" rules={[{ required: true, message: 'Please enter a URL' }]}>
                    <Input type="url" placeholder="https://example.com/file.pdf" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={fetching}>Preview URL</Button>
                  </Form.Item>
                </Col>
              </Row>
              <Paragraph type="secondary">Note: Some URLs may block loading due to CORS. Download the file and use local upload if that happens.</Paragraph>
            </Form>
          </Card>

          <Card title="Preview a Local File">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input type="file" onChange={onLocalFile} ref={fileInputRef} />
            </Space>
          </Card>

          <Card title="Preview">
            <div className="preview-container">
              {preview.kind === 'image' && (
                <Image src={preview.url} alt={preview.filename} />
              )}
              {preview.kind === 'pdf' && (
                <iframe src={preview.url} title={preview.filename} style={{ height: '70vh', border: 0 }} />
              )}
              {preview.kind === 'video' && (
                <video src={preview.url} controls />
              )}
              {preview.kind === 'audio' && (
                <audio src={preview.url} controls />
              )}
              {preview.kind === 'text' && (
                <pre data-lang={preview.type.split('/')[1] || ''}>{preview.text}</pre>
              )}
              {preview.kind === 'download' && (
                <Button type="link" href={preview.url} download={preview.filename}>
                  Download {preview.filename}
                </Button>
              )}
              {preview.kind === 'empty' && (
                <Paragraph type="secondary">No preview yet.</Paragraph>
              )}
            </div>
            {info && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Alert message={info} type="info" showIcon />
              </>
            )}
          </Card>

          <Card title="Text to PDF">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Input.TextArea id="pdfTextArea" rows={10} placeholder="Paste or type text here..." />
              <Row gutter={12}>
                <Col xs={24} md={18}>
                  <Input id="pdfFilenameInput" placeholder="Filename (optional)" />
                </Col>
                <Col xs={24} md={6}>
                  <Button type="primary" onClick={onDownloadPdf} block>Download PDF</Button>
                </Col>
              </Row>
              <Paragraph type="secondary">Powered by jsPDF (client-side). Long text will paginate automatically.</Paragraph>
            </Space>
          </Card>
        </Space>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        <small>MIT Licensed. Built for quick, private, client-side previews.</small>
      </Footer>
    </Layout>
  )
}
