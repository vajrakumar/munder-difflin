import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Inbox, Search, Settings } from 'lucide-react';
import { applyPaperTheme, type PaperTheme } from './design/paper';
import './design/fonts.css';
import './design/paper/tokens.css';
import './ui/ui.css';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Combobox,
  Dialog,
  DialogContent,
  DialogTrigger,
  EmptyState,
  IconButton,
  Input,
  Kbd,
  Label,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  Sheet,
  SheetContent,
  SheetTrigger,
  Skeleton,
  Splitter,
  Table,
  TBody,
  TD,
  TH,
  THead,
  ToastProvider,
  Tooltip,
  TooltipProvider,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TR,
  useToast
} from './ui';

applyPaperTheme('light');

function Gallery(): JSX.Element {
  const toast = useToast();
  const [theme, setTheme] = useState<PaperTheme>('light');
  const [engine, setEngine] = useState('claude');
  const [agent, setAgent] = useState('god');

  function setT(next: PaperTheme): void {
    setTheme(next);
    applyPaperTheme(next);
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 80px' }}>
      <h1 style={{ fontSize: 28, letterSpacing: '-0.03em', margin: '0 0 8px' }}>Paper gallery</h1>
      <p style={{ color: 'var(--paper-text-muted)', margin: '0 0 24px' }}>
        Radix primitives styled with Paper tokens. Theme:{' '}
        {(['light', 'dark', 'hc'] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={theme === t ? 'primary' : 'secondary'}
            onClick={() => setT(t)}
            style={{ marginInlineEnd: 6 }}
          >
            {t}
          </Button>
        ))}
      </p>

      <section>
        <h2>Buttons</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button size="sm">Small</Button>
          <Tooltip content="Search the office">
            <IconButton label="Search">
              <Search size={16} />
            </IconButton>
          </Tooltip>
          <Kbd>⌘K</Kbd>
        </div>
      </section>

      <section>
        <h2>Inputs</h2>
        <Label htmlFor="q">Query</Label>
        <Input id="q" placeholder="Find an agent…" style={{ width: 240, marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Select
            value={engine}
            onValueChange={setEngine}
            options={[
              { value: 'claude', label: 'Claude' },
              { value: 'grok', label: 'Grok' },
              { value: 'codex', label: 'Codex' }
            ]}
          />
          <Combobox
            value={agent}
            onChange={setAgent}
            options={[
              { value: 'god', label: 'Michael' },
              { value: 'dev', label: 'Developer' },
              { value: 'qa', label: 'Tester' }
            ]}
          />
        </div>
      </section>

      <section>
        <h2>Tabs, menu, popover</h2>
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">Inbox</TabsTrigger>
            <TabsTrigger value="two">Tasks</TabsTrigger>
          </TabsList>
          <TabsContent value="one">Nothing needs you.</TabsContent>
          <TabsContent value="two">No open tickets.</TabsContent>
        </Tabs>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Menu>
            <MenuTrigger asChild>
              <Button variant="secondary">Menu</Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={() => toast('Spawned a temp')}>Spawn temp</MenuItem>
              <MenuItem onSelect={() => toast('Archived')}>Archive</MenuItem>
            </MenuContent>
          </Menu>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost">Popover</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p style={{ margin: 8, fontSize: 13 }}>Hover cards and notes land here.</p>
            </PopoverContent>
          </Popover>
        </div>
      </section>

      <section>
        <h2>Dialog &amp; sheet</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open dialog</Button>
            </DialogTrigger>
            <DialogContent title="Hire an agent" description="Pick a role. The human still confirms spawn.">
              <Button onClick={() => toast('Queued')}>Queue hire</Button>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">Open sheet</Button>
            </SheetTrigger>
            <SheetContent title="Ticket MDF-7">
              <p style={{ color: 'var(--paper-text-muted)', fontSize: 13 }}>Side-sheet detail for tasks.</p>
            </SheetContent>
          </Sheet>
          <Button variant="ghost" onClick={() => toast('Saved')}>
            Toast
          </Button>
        </div>
      </section>

      <section>
        <h2>Identity</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Avatar name="Michael Scott" />
          <Avatar name="Developer" size="lg" />
          <Badge>idle</Badge>
          <Badge tone="accent">waiting</Badge>
          <Badge tone="warning">working</Badge>
          <Badge tone="danger">blocked</Badge>
          <Badge tone="success">done</Badge>
        </div>
      </section>

      <section>
        <h2>Card, table, skeleton, empty</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card>
            <h3>Live line</h3>
            <p>Developer · Read · 12k tokens</p>
          </Card>
          <div>
            <Skeleton style={{ width: '80%', marginBottom: 8 }} />
            <Skeleton style={{ width: '60%' }} />
          </div>
        </div>
        <Table style={{ marginTop: 16 }}>
          <THead>
            <TR>
              <TH>Agent</TH>
              <TH>Status</TH>
              <TH>Cost</TH>
            </TR>
          </THead>
          <TBody>
            <TR>
              <TD>Michael</TD>
              <TD>idle</TD>
              <TD>$0.33</TD>
            </TR>
            <TR>
              <TD>Developer</TD>
              <TD>working</TD>
              <TD>$1.02</TD>
            </TR>
          </TBody>
        </Table>
        <EmptyState
          icon={<Inbox size={20} />}
          title="Inbox zero"
          description="Questions, mail and Slack land here."
          action={<Button size="sm" variant="secondary">Refresh</Button>}
        />
      </section>

      <section>
        <h2>Splitter</h2>
        <Splitter left={<div>Terminal</div>} right={<div>Inspector</div>} />
      </section>

      <p style={{ marginTop: 40, color: 'var(--paper-text-muted)', fontSize: 12 }}>
        <Settings size={12} style={{ verticalAlign: 'middle' }} /> src/renderer/src/ui · MDF-7
      </p>
    </div>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('No root');
createRoot(root).render(
  <StrictMode>
    <TooltipProvider>
      <ToastProvider>
        <Gallery />
      </ToastProvider>
    </TooltipProvider>
  </StrictMode>
);
