import { CrmLead } from '../types/crm';

export const INITIAL_CRM_LEADS: CrmLead[] = [
  {
    id: 'lead-majujaya-01',
    companyName: 'PT Maju Jaya Retail',
    contactPerson: 'Bpk. Rudi Hartono',
    contactRole: 'Head of Marketing',
    contactPhone: '081234567890',
    contactEmail: 'rudi.hartono@majujaya.co.id',
    picName: 'Suherman (Superadmin)',
    picEmail: 'suherman.reklame2012@gmail.com',
    targetSpotIds: ['spot-bdg-01'],
    targetSpotNames: ['Billboard Simpang Lima Asia Afrika'],
    targetLocationsSummary: 'Jl. Asia Afrika No. 120, Kota Bandung',
    dealValue: 120000000,
    duration: '3 Bulan',
    stage: 'negosiasi',
    priority: 'hot',
    nextAction: 'Kirim revisi draf SPK & diskon sewa 3 bulan untuk penandatanganan',
    nextActionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Besok
    notes: 'Klien sangat tertarik dengan visibilitas titik Simpang Lima menjelang promo akhir tahun. Meminta penerangan lampu LED tambahan.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        id: 'hist-1',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        action: 'Lead masuk dari permintaan penawaran web',
        actor: 'Sistem'
      },
      {
        id: 'hist-2',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        action: 'Kirim proposal deck via WhatsApp',
        actor: 'Suherman',
        fromStage: 'lead_baru',
        toStage: 'follow_up'
      },
      {
        id: 'hist-3',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        action: 'Klien setuju harga estimasi, masuk tahap negosiasi SPK',
        actor: 'Suherman',
        fromStage: 'follow_up',
        toStage: 'negosiasi'
      }
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Kirim draf kontrak SPK final via WhatsApp & Email',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueTime: '10:00',
        completed: false,
        type: 'contract',
        assignedPic: 'Suherman (Superadmin)',
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-2',
        title: 'Verifikasi kesiapan material cetak visual Flexi Backlite',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueTime: '14:00',
        completed: false,
        type: 'survey',
        assignedPic: 'Suherman (Superadmin)',
        createdAt: new Date().toISOString()
      }
    ],
    documents: [
      {
        id: 'doc-1',
        name: 'Proposal_OOH_PT_MajuJaya_AsiaAfrika.pdf',
        type: 'proposal_pdf',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        size: '2.4 MB'
      }
    ]
  },
  {
    id: 'lead-honda-02',
    companyName: 'PT Daya Adicipta Motora (Honda Jabar)',
    contactPerson: 'Ibu Maya Safitri',
    contactRole: 'Brand & Communication Manager',
    contactPhone: '081321098765',
    contactEmail: 'maya.safitri@dam.co.id',
    picName: 'Suherman (Superadmin)',
    picEmail: 'suherman.reklame2012@gmail.com',
    targetSpotIds: ['spot-bdg-02', 'spot-bdg-03'],
    targetSpotNames: ['Videotron Simpang Pasteur', 'Billboard Dago Flyover'],
    targetLocationsSummary: 'Jl. Dr. Djunjunan (Pasteur) & Jl. Ir. H. Juanda',
    dealValue: 280000000,
    duration: '6 Bulan',
    stage: 'follow_up',
    priority: 'hot',
    nextAction: 'Follow up hasil review direksi terkait slot prime time malam (17:00 - 21:00)',
    nextActionDate: new Date().toISOString().split('T')[0], // Hari ini
    notes: 'Kampanye peluncuran varian motor matic baru. Prioritas traffic komuter arah gerbang tol Pasteur.',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        id: 'hist-h1',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        action: 'Inquiry awal melalui WhatsApp',
        actor: 'Ibu Maya Safitri'
      },
      {
        id: 'hist-h2',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        action: 'Presentasi proposal teknis OTS & simulasi kepadatan kendaraan',
        actor: 'Suherman',
        fromStage: 'lead_baru',
        toStage: 'follow_up'
      }
    ],
    tasks: [
      {
        id: 'task-h1',
        title: 'Telepon Ibu Maya konfirmasi jadwal meeting zoom direksi',
        dueDate: new Date().toISOString().split('T')[0],
        dueTime: '13:30',
        completed: false,
        type: 'call',
        assignedPic: 'Suherman (Superadmin)',
        createdAt: new Date().toISOString()
      }
    ],
    documents: [
      {
        id: 'doc-h1',
        name: 'Analisis_Traffic_DOOH_Pasteur_Honda.pdf',
        type: 'proposal_pdf',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        size: '3.8 MB'
      }
    ]
  },
  {
    id: 'lead-bjb-03',
    companyName: 'Bank BJB Kantor Pusat',
    contactPerson: 'Bpk. Dani Darmawan',
    contactRole: 'Divisi Corporate Secretary',
    contactPhone: '081122334455',
    contactEmail: 'dani.darmawan@bankbjb.co.id',
    picName: 'Rian Saputra',
    picEmail: 'rian.sales@suhermanreklame.com',
    targetSpotIds: ['spot-bdg-04'],
    targetSpotNames: ['Billboard Prime Jl. Ir. H. Juanda (Dago BJB)'],
    targetLocationsSummary: 'Jl. Ir. H. Juanda No. 80, Dago Atas',
    dealValue: 185000000,
    duration: '1 Tahun',
    stage: 'won',
    priority: 'warm',
    nextAction: 'Koordinasi tim teknis pemasangan visual kampanye Q4 & serah terima BAST',
    nextActionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'Closing kontrak tahunan sewa billboard prime. Pembayaran termin pertama 50% telah lunas.',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        id: 'hist-b1',
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        action: 'Tender penunjukan langsung sewa billboard Dago',
        actor: 'Rian Saputra'
      },
      {
        id: 'hist-b2',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        action: 'SPK Nomor 042/SPK/BJB-OOH/2026 resmi diteken',
        actor: 'Rian Saputra',
        fromStage: 'negosiasi',
        toStage: 'won'
      }
    ],
    tasks: [
      {
        id: 'task-b1',
        title: 'Kirim tim malam untuk pasang materi visual Flexi Banner BJB',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueTime: '22:00',
        completed: false,
        type: 'survey',
        assignedPic: 'Rian Saputra',
        createdAt: new Date().toISOString()
      }
    ],
    documents: [
      {
        id: 'doc-b1',
        name: 'SPK_Resmi_Bank_BJB_Billboard_Dago_2026.pdf',
        type: 'spk',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        size: '1.9 MB'
      }
    ]
  },
  {
    id: 'lead-eiger-04',
    companyName: 'Eiger Adventure (PT Eigerindo MPI)',
    contactPerson: 'Bpk. Arif Budiman',
    contactRole: 'OOH Media Specialist',
    contactPhone: '085612345678',
    contactEmail: 'arif.budiman@eigeradventure.com',
    picName: 'Rian Saputra',
    picEmail: 'rian.sales@suhermanreklame.com',
    targetSpotIds: ['spot-bdg-05'],
    targetSpotNames: ['Billboard Jalur Wisata Setiabudi - Lembang'],
    targetLocationsSummary: 'Jl. Dr. Setiabudi No. 229, Sukasari, Bandung',
    dealValue: 95000000,
    duration: '1 Bulan',
    stage: 'lead_baru',
    priority: 'attention',
    nextAction: 'Kirim paket penawaran titik koridor wisata akhir pekan & estimasi OTS libur panjang',
    nextActionDate: new Date().toISOString().split('T')[0], // Hari ini (perlu perhatian!)
    notes: 'Klien menanyakan ketersediaan titik di Setiabudi untuk kampanye perlengkapan outdoor musim hujan.',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        id: 'hist-e1',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        action: 'Inquiry masuk via direct WhatsApp Suherman Reklame',
        actor: 'Bpk. Arif Budiman'
      }
    ],
    tasks: [
      {
        id: 'task-e1',
        title: 'Generate proposal AI terpadu untuk Eiger Setiabudi',
        dueDate: new Date().toISOString().split('T')[0],
        dueTime: '15:00',
        completed: false,
        type: 'proposal',
        assignedPic: 'Rian Saputra',
        createdAt: new Date().toISOString()
      }
    ],
    documents: []
  },
  {
    id: 'lead-telkomsel-05',
    companyName: 'Telkomsel Regional Jawa Barat',
    contactPerson: 'Ibu Ratna Dewi',
    contactRole: 'Media & Advertising Planner',
    contactPhone: '081211223344',
    contactEmail: 'ratna_dewi@telkomsel.co.id',
    picName: 'Dewi Lestari',
    picEmail: 'dewi.media@suhermanreklame.com',
    targetSpotIds: ['spot-bdg-06'],
    targetSpotNames: ['DOOH LED Screen Flyover Moch. Toha'],
    targetLocationsSummary: 'Simpang Keluar Tol Pasir Koja / Moch. Toha',
    dealValue: 165000000,
    duration: '3 Bulan',
    stage: 'follow_up',
    priority: 'warm',
    nextAction: 'Kirim bukti tayang video spot DOOH & laporan frekuensi tayang (loop per jam)',
    nextActionDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'Promosi jaringan Hyper 5G di Bandung Selatan. Meminta laporan pemutaran tayang per 5 menit.',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        id: 'hist-t1',
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        action: 'Diskusi awal teknis rotasi DOOH',
        actor: 'Dewi Lestari'
      }
    ],
    tasks: [
      {
        id: 'task-t1',
        title: 'Jadwalkan uji tayang video materi Telkomsel 15 detik di LED screen',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueTime: '11:00',
        completed: false,
        type: 'meeting',
        assignedPic: 'Dewi Lestari',
        createdAt: new Date().toISOString()
      }
    ],
    documents: []
  }
];
