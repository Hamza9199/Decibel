package com.example.mobilnaapp.ui.home

import android.media.MediaPlayer
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.mobilnaapp.R
import com.example.mobilnaapp.data.model.Pjesma
import com.example.mobilnaapp.ui.player.AudioPlayerBar
import com.example.mobilnaapp.viewmodel.HomeViewModel

class HomeFragment : Fragment() {

    private val viewModel: HomeViewModel by viewModels()
    private lateinit var recyclerView: RecyclerView
    private lateinit var adapter: HomeAdapter

    private var mediaPlayer: MediaPlayer? = null
    private var currentSong: Pjesma? = null
    private var audioPlayerBar: AudioPlayerBar? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val root = inflater.inflate(R.layout.fragment_home, container, false)
        // Dodaj AudioPlayerBar na dno ekrana
        val frame = FrameLayout(requireContext())
        frame.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
        )
        frame.addView(root)
        audioPlayerBar = AudioPlayerBar(requireContext())
        frame.addView(audioPlayerBar)
        return frame
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        // Postavi status bar boju kao Spotify
        activity?.window?.statusBarColor = ContextCompat.getColor(requireContext(), R.color.spotify_dark_bg)
        WindowCompat.getInsetsController(requireActivity().window, requireView()).isAppearanceLightStatusBars = false

        recyclerView = view.findViewById(R.id.recyclerPjesme)
        recyclerView.layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
        adapter = HomeAdapter(emptyList()) { pjesma ->
            playSong(pjesma)
        }
        recyclerView.adapter = adapter

        viewModel.pjesme.observe(viewLifecycleOwner) {
            adapter = HomeAdapter(it) { pjesma ->
                playSong(pjesma)
            }
            recyclerView.adapter = adapter
        }

        viewModel.fetchPjesme()
    }

    private fun playSong(pjesma: Pjesma) {
        try {
            mediaPlayer?.release()
            mediaPlayer = MediaPlayer().apply {
                setDataSource(pjesma.putanjaAudio)
                prepareAsync()
                setOnPreparedListener { start() }
            }
            currentSong = pjesma
            audioPlayerBar?.setSong(pjesma, mediaPlayer)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        mediaPlayer?.release()
        audioPlayerBar = null
    }
}
