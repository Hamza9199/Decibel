package com.example.mobilnaapp.ui.home

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.example.mobilnaapp.R
import com.example.mobilnaapp.data.model.Pjesma

class HomeAdapter(
    private val pjesme: List<Pjesma>,
    private val onSongClick: (Pjesma) -> Unit
) : RecyclerView.Adapter<HomeAdapter.PjesmaViewHolder>() {

    // ViewHolder klasa za prikaz jedne pjesme
    class PjesmaViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val naziv: TextView = view.findViewById(R.id.nazivPjesme)
        val opis: TextView = view.findViewById(R.id.opisPjesme)
        val slika: ImageView = view.findViewById(R.id.slikaPjesme)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PjesmaViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_pjesma, parent, false)
        return PjesmaViewHolder(view)
    }

    override fun onBindViewHolder(holder: PjesmaViewHolder, position: Int) {
        val pjesma = pjesme[position]
        holder.naziv.text = pjesma.naziv
        holder.opis.text = pjesma.opis ?: ""

        Glide.with(holder.itemView.context)
            .load(pjesma.putanjaSlika)
            .placeholder(R.drawable.ic_launcher_background)
            .into(holder.slika)

        holder.itemView.setOnClickListener {
            onSongClick(pjesma)
        }
    }

    override fun getItemCount(): Int = pjesme.size
}
